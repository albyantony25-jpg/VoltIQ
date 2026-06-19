import json
import uuid
import asyncio
from typing import List, Optional, Dict, Any, AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import asyncpg
from groq import AsyncGroq
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

from core.dependencies import get_db_pool, get_current_user
from core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["AI Agent Chat"], redirect_slashes=False)

class ChatRequest(BaseModel):
    home_id: uuid.UUID
    message: str
    session_id: Optional[uuid.UUID] = None

class SessionResponse(BaseModel):
    id: uuid.UUID
    updated_at: str

# ---------------------------------------------------------------------------
# Groq client override for Llama 3
# ---------------------------------------------------------------------------
def _get_client() -> AsyncGroq:
    import os
    return AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

MODEL = "llama-3.3-70b-versatile"

# ---------------------------------------------------------------------------
# Functions array for GPT-4o
# ---------------------------------------------------------------------------
CHAT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_appliance_details",
            "description": "Get wattage and usage details for a specific appliance.",
            "parameters": {
                "type": "object",
                "properties": {"name": {"type": "string"}},
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_savings_if",
            "description": "Calculate potential INR savings if an action is taken on an appliance.",
            "parameters": {
                "type": "object",
                "properties": {
                    "appliance_id": {"type": "string"},
                    "action": {"type": "string", "description": "e.g., 'reduce usage by 2 hours', 'replace with 5-star', 'unplug'"}
                },
                "required": ["appliance_id", "action"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "compare_with_peers",
            "description": "Compare home baseline metric against regional peers.",
            "parameters": {
                "type": "object",
                "properties": {"metric": {"type": "string", "description": "e.g., 'monthly_kwh', 'co2'"}},
                "required": ["metric"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "forecast_remaining_bill",
            "description": "Get estimated bill cost for the remainder of the current month.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_tips_for_category",
            "description": "Fetch generic energy saving tips for a category.",
            "parameters": {
                "type": "object",
                "properties": {"category": {"type": "string", "description": "e.g., 'hvac', 'kitchen', 'lighting'"}},
                "required": ["category"]
            }
        }
    }
]

# ---------------------------------------------------------------------------
# Context Builder
# ---------------------------------------------------------------------------
async def build_home_context(home_id: uuid.UUID, db: asyncpg.Pool) -> dict:
    context = {"profile": "Not found", "current_month_kwh": 0, "top_5_appliances": "", "last_3_bills": "", "tariff": ""}
    if db is None: return context
    try:
        async with db.acquire() as conn:
            home = await conn.fetchrow("SELECT * FROM homes WHERE id = $1", home_id)
            if home:
                context["profile"] = f"{home['home_type']}, {home['bedrooms']} beds, {home['occupants']} occupants in {home['city'] or 'Unknown'}."
            
            appliances = await conn.fetch("SELECT id, name, category, rated_watts FROM appliances WHERE home_id = $1 AND is_active = true ORDER BY rated_watts DESC LIMIT 5", home_id)
            context["top_5_appliances"] = ", ".join([f"{a['name']} ({a['category']}, {a['rated_watts']}W, ID:{a['id']})" for a in appliances])
            
            bills = await conn.fetch("SELECT billing_month, units_consumed, total_amount_inr FROM bills WHERE home_id = $1 ORDER BY billing_month DESC LIMIT 3", home_id)
            context["last_3_bills"] = ", ".join([f"{b['billing_month']}: {b['units_consumed']}kwh (₹{b['total_amount_inr']})" for b in bills])
            
            tariff = await conn.fetchrow("SELECT name, fixed_charge_inr FROM tariffs WHERE is_default = true LIMIT 1")
            if tariff:
                context["tariff"] = f"{tariff['name']} plan with ₹{tariff['fixed_charge_inr']} fixed charge."
            
            # Rough current month kwh mapping
            if bills:
                context["current_month_kwh"] = (bills[0]['units_consumed'] or 200) * 0.4
    except Exception as e:
        logger.error(f"Failed to build chat context: {e}")
    return context

# ---------------------------------------------------------------------------
# Helper Tasks
# ---------------------------------------------------------------------------
async def save_chat_session(db_pool: asyncpg.Pool, session_id: uuid.UUID, user_id: uuid.UUID, new_messages: list):
    if db_pool is None: return
    try:
        async with db_pool.acquire() as conn:
            # Create table if not exist just in case Sprint 1 didn't catch this 
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id UUID PRIMARY KEY,
                    user_id UUID,
                    messages JSONB DEFAULT '[]',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """)
            row = await conn.fetchrow("SELECT messages FROM chat_sessions WHERE id = $1", session_id)
            if row:
                history = json.loads(row['messages']) if isinstance(row['messages'], str) else row['messages']
                history.extend(new_messages)
                await conn.execute(
                    "UPDATE chat_sessions SET messages = $1::jsonb, updated_at = now() WHERE id = $2",
                    json.dumps(history), session_id
                )
            else:
                await conn.execute(
                    "INSERT INTO chat_sessions (id, user_id, messages) VALUES ($1, $2, $3::jsonb)",
                    session_id, user_id, json.dumps(new_messages)
                )
    except Exception as e:
        logger.error(f"Failed to save chat: {e}")

# ---------------------------------------------------------------------------
# Tool mocking logic (In production, wire to real services)
# ---------------------------------------------------------------------------
def execute_tool(name: str, args: dict) -> str:
    if name == "get_appliance_details":
        return f"Appliance {args.get('name')} consumes approx 18% of total household energy on average."
    elif name == "calculate_savings_if":
        return f"Taking action '{args.get('action')}' on appliance {args.get('appliance_id')} would save roughly ₹850 annually."
    elif name == "compare_with_peers":
        return f"Your {args.get('metric')} is 12% lower than similar homes in your area."
    elif name == "forecast_remaining_bill":
        return "You are on track to spend ₹2,600 this month, which is ₹400 below your average."
    elif name == "get_tips_for_category":
        return f"For '{args.get('category')}', regular maintenance and running during off-peak hours yield the highest savings."
    return "Tool execution successful but yielded no new data."

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/sessions/{user_id_path}", response_model=List[dict])
async def list_sessions(
    user_id_path: uuid.UUID,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """List sessions for the authenticated user (ignores path param in favor of token)."""
    if db is None: return []
    try:
        async with db.acquire() as conn:
            rows = await conn.fetch("SELECT id, created_at, updated_at FROM chat_sessions WHERE user_id = $1 ORDER BY updated_at DESC", user_id)
            return [dict(r) for r in rows]
    except Exception:
        return []

@router.get("/sessions/{user_id_path}/messages/{session_id}")
async def get_session_history(
    user_id_path: uuid.UUID,
    session_id: uuid.UUID,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """Get history for a specific session, verifying ownership via token."""
    if db is None: return {"messages": []}
    async with db.acquire() as conn:
        row = await conn.fetchrow("SELECT messages FROM chat_sessions WHERE id = $1 AND user_id = $2", session_id, user_id)
        if not row:
            raise HTTPException(status_code=404, detail="Session not found or unauthorized")
        return {"messages": json.loads(row['messages']) if isinstance(row['messages'], str) else row['messages']}

@router.delete("/sessions/{id}")
async def delete_session(
    id: uuid.UUID,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    if db is None: return {"status": "success"}
    async with db.acquire() as conn:
        # Verify ownership
        row = await conn.fetchrow("SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2", id, user_id)
        if not row:
            raise HTTPException(status_code=404, detail="Session not found or unauthorized")
        await conn.execute("DELETE FROM chat_sessions WHERE id = $1", id)
    return {"status": "success"}

@router.post("/stream")
@limiter.limit("50/day")
async def chat_stream(
    request: Request,
    body: ChatRequest,
    background_tasks: BackgroundTasks,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    session_id = body.session_id or uuid.uuid4()
    
    # 1. Fetch History
    history = []
    if body.session_id and db:
        async with db.acquire() as conn:
            try:
                row = await conn.fetchrow("SELECT messages FROM chat_sessions WHERE id = $1", session_id)
                if row:
                    history = json.loads(row['messages']) if isinstance(row['messages'], str) else row['messages']
            except Exception: pass
    
    # Keep last 10
    history = history[-10:]

    # Strip tool calls from history context passing to OpenAI if they got malformed
    clean_history = [m for m in history if m.get("role") in ["user", "assistant", "tool"]]
    
    # 2. Build Context
    ctx = await build_home_context(body.home_id, db)
    
    system_prompt = f"""You are EnergyIQ, an intelligent energy advisor. You have access to this user's home energy data:

Home: {ctx['profile']}
Current month usage: {ctx['current_month_kwh']} kWh so far
Top consumers: {ctx['top_5_appliances']}
Last 3 bills: {ctx['last_3_bills']}
Current tariff: {ctx['tariff']}

Personality: friendly, concise, data-driven. Use INR for all costs.
Always reference specific appliances and months — never generic advice.
Max 3 sentences for simple queries. Use markdown tables for comparisons.
End every response with exactly 1 actionable next step."""

    # 3. Assemble Messages
    messages = [{"role": "system", "content": system_prompt}] + clean_history + [{"role": "user", "content": body.message}]
    new_db_messages = [{"role": "user", "content": body.message}]

    # 4. Stream Generator
    async def event_generator() -> AsyncGenerator[str, None]:
        client = _get_client()
        
        try:
            # Send initial session id so client can attach to it
            yield f'data: {json.dumps({"session_id": str(session_id), "type": "meta"})}\n\n'

            # Try to hit OpenAI APIs
            stream = await client.chat.completions.create(
                model=MODEL,
                messages=messages,
                tools=CHAT_TOOLS,
                tool_choice="auto",
                stream=True,
                temperature=0.7,
                max_tokens=500
            )

            full_reply = ""
            tool_call_buffer = None
            
            async for chunk in stream:
                if await request.is_disconnected():
                    # Stop if client drops early
                    break
                
                if not getattr(chunk, "choices", None):
                    continue
                
                delta = chunk.choices[0].delta
                
                # Check for tool_calls chunk
                if getattr(delta, "tool_calls", None):
                    tc = delta.tool_calls[0]
                    if getattr(tc, "function", None) and getattr(tc.function, "name", None):
                        tc_id = getattr(tc, "id", None) or f"call_{uuid.uuid4().hex[:8]}"
                        tool_call_buffer = {"name": tc.function.name, "arguments": getattr(tc.function, "arguments", "") or "", "id": tc_id}
                    elif getattr(tc, "function", None) and getattr(tc.function, "arguments", None) and tool_call_buffer:
                        tool_call_buffer["arguments"] += tc.function.arguments
                    continue
                
                # Text content emission
                if getattr(delta, "content", None):
                    full_reply += delta.content
                    yield f'data: {json.dumps({"token": delta.content})}\n\n'
            
            # Handle if the GPT stopped to call a tool instead of responding
            if tool_call_buffer:
                # Execute tool
                tool_args = json.loads(tool_call_buffer["arguments"]) if tool_call_buffer["arguments"] else {}
                tool_res = execute_tool(tool_call_buffer["name"], tool_args)
                
                # We do a secondary call to get the final text after tool execution completion.
                # Since SSE doesn't handle nested streaming back and forth well natively without custom protocol,
                # we just do a non-streaming resolution right here and stream the full block back to save complexity,
                # Run the secondary call to get the final text after tool execution completion.
                # To keep it simple, we do a non-streaming second call for this block
                tc_id = tool_call_buffer.get("id", "call_1")
                assistant_msg = {
                    "role": "assistant", 
                    "content": None, 
                    "tool_calls": [{"id": tc_id, "type": "function", "function": {"name": tool_call_buffer["name"], "arguments": tool_call_buffer["arguments"]}}]
                }
                tool_msg = {"role": "tool", "tool_call_id": tc_id, "name": tool_call_buffer["name"], "content": tool_res}
                
                messages.extend([assistant_msg, tool_msg])
                new_db_messages.extend([assistant_msg, tool_msg])
                
                res2 = await client.chat.completions.create(model=MODEL, messages=messages, stream=False)
                
                # In non-streaming mode, we can just grab choices[0]
                final_text = res2.choices[0].message.content or "Done analyzing."
                full_reply += final_text
                
                # Stream it out as a block
                yield f'data: {json.dumps({"token": final_text})}\n\n'

            new_db_messages.append({"role": "assistant", "content": full_reply})
            background_tasks.add_task(save_chat_session, db, session_id, user_id, new_db_messages)
            
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"Chat stream error: {e}")
            import traceback
            err_msg = traceback.format_exc()
            yield f'data: {json.dumps({"token": f"ERROR: {err_msg}\\n\\n"})}\n\n'
            await asyncio.sleep(0.5)
            mock_resp = f"Based on your profile, I see you have these appliances: {ctx['top_5_appliances']}. To reduce your next bill, maybe use them less during peak hours. \\n\\n**Next Step**: Should I show you a breakdown of your highest consumer?"
            for chunk in mock_resp.split(" "):
                yield f'data: {json.dumps({"token": chunk + " "})}\n\n'
                await asyncio.sleep(0.05)
            
            new_db_messages.append({"role": "assistant", "content": mock_resp.replace("\\n", "\n")})
            background_tasks.add_task(save_chat_session, db, session_id, user_id, new_db_messages)
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )
