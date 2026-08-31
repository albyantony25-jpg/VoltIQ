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
from core.rate_limiter import limiter

from core.dependencies import get_db_pool, get_current_user
from core.config import settings
from core.embeddings import get_embedding

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

MODEL_COMPLEX = "llama-3.3-70b-versatile"
MODEL_SIMPLE = "llama-3.1-8b-instant"

def classify_query_complexity(message: str) -> str:
    complex_keywords = ["forecast", "predict", "analyze", "why", "how much", "compare", "recommend", "save", "calculate"]
    msg_lower = message.lower()
    if len(msg_lower.split()) > 20 or any(k in msg_lower for k in complex_keywords):
        return MODEL_COMPLEX
    return MODEL_SIMPLE

# ---------------------------------------------------------------------------
# Functions array for GPT-4o
# ---------------------------------------------------------------------------
CHAT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_bill_breakdown",
            "description": "Get bill breakdown for a specific month.",
            "parameters": {
                "type": "object",
                "properties": {"month": {"type": "string", "description": "e.g., '2026-08'"}},
                "required": ["month"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_appliance_usage",
            "description": "Get total rated wattage and appliance list for the home.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "compare_tariffs",
            "description": "Compare average fixed charges across states.",
            "parameters": {
                "type": "object",
                "properties": {"state": {"type": "string"}},
                "required": ["state"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_recent_alerts",
            "description": "Get recent anomalies/alerts for the home.",
            "parameters": {"type": "object", "properties": {}}
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
            context["top_5_appliances"] = ", ".join([f"{a['name']} ({a['category']}, {a['rated_watts']}W)" for a in appliances])
            
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
async def execute_tool(name: str, args: dict, home_id: uuid.UUID, db: asyncpg.Pool) -> str:
    if not db:
        return "Database unavailable."
    try:
        async with db.acquire() as conn:
            if name == "get_bill_breakdown":
                row = await conn.fetchrow("SELECT units_consumed, total_amount_inr FROM bills WHERE home_id = $1 AND billing_month = $2", home_id, args.get("month"))
                if row:
                    return f"Bill for {args.get('month')}: {row['units_consumed']} kWh, ₹{row['total_amount_inr']}."
                return f"No bill found for {args.get('month')}."
            elif name == "get_appliance_usage":
                rows = await conn.fetch("SELECT name, rated_watts FROM appliances WHERE home_id = $1 AND is_active = true", home_id)
                if rows:
                    total = sum(r['rated_watts'] for r in rows)
                    apps = ", ".join([f"{r['name']} ({r['rated_watts']}W)" for r in rows])
                    return f"Total rated wattage: {total}W. Appliances: {apps}."
                return "No active appliances found."
            elif name == "compare_tariffs":
                st = args.get("state", "Kerala")
                avg = await conn.fetchval("SELECT AVG(fixed_charge_inr) FROM tariffs WHERE state = $1", st)
                return f"Average fixed charge in {st} is ₹{avg:.2f}." if avg else "No data for this state."
            elif name == "get_recent_alerts":
                rows = await conn.fetch("SELECT title, priority FROM alerts WHERE home_id = $1 AND is_read = false ORDER BY created_at DESC LIMIT 3", home_id)
                if rows:
                    alerts = ", ".join([f"[{r['priority']}] {r['title']}" for r in rows])
                    return f"Unread alerts: {alerts}"
                return "No unread alerts."
    except Exception as e:
        logger.error(f"Tool {name} failed: {e}")
        return f"Error executing {name}."
    return "Unknown tool."

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
    
    # Keep last 10, only user/assistant text messages (no tool calls or tool results)
    history = history[-10:]

    # Strip ALL tool-related messages from history — only keep clean user/assistant text
    clean_history = [
        m for m in history
        if m.get("role") in ["user", "assistant"]
        and isinstance(m.get("content"), str)
        and m.get("content")  # non-empty
        and not m.get("tool_calls")  # no tool call stubs
    ]
    
    # 2. Build Context
    ctx = await build_home_context(body.home_id, db)
    
    # RAG Retrieval
    rag_context = ""
    if db:
        try:
            emb = await get_embedding(body.message)
            emb_str = f"[{','.join(map(str, emb))}]"
            async with db.acquire() as conn:
                # Top 3 similar items, distance < 0.7
                results = await conn.fetch(
                    """
                    SELECT content, 1 - (embedding <=> $1::vector) AS similarity 
                    FROM embeddings 
                    WHERE 1 - (embedding <=> $1::vector) > 0.3
                    ORDER BY embedding <=> $1::vector 
                    LIMIT 3
                    """,
                    emb_str
                )
                if results:
                    rag_context = "\nRelevant Knowledge Base Information:\n" + "\n".join([f"- {r['content']}" for r in results])
        except Exception as e:
            logger.error(f"RAG search failed: {e}")

    system_prompt = f"""You are Volt Assistant, an intelligent energy advisor for VoltIQ. You have access to this user's home energy data:

Home: {ctx['profile']}
Current month usage: {ctx['current_month_kwh']} kWh so far
Top consumers: {ctx['top_5_appliances']}
Last 3 bills: {ctx['last_3_bills']}
Current tariff: {ctx['tariff']}
{rag_context}

Personality: friendly, concise, data-driven. Use INR (₹) for all costs.
Always reference specific appliance names and months — never give generic advice.
Max 3 sentences for simple queries. Use markdown tables for comparisons.
NEVER output JSON, function call syntax, or raw object data — only natural language.
End every response with exactly 1 actionable next step."""

    # 3. Assemble Messages
    messages = [{"role": "system", "content": system_prompt}] + clean_history + [{"role": "user", "content": body.message}]
    new_db_messages = [{"role": "user", "content": body.message}]

    # 4. Stream Generator
    async def event_generator() -> AsyncGenerator[str, None]:
        client = _get_client()
        import time
        start_time = time.time()
        
        try:
            # Send initial session id so client can attach to it
            yield f'data: {json.dumps({"session_id": str(session_id), "type": "meta"})}\n\n'

            # Semantic Caching Check
            cached_response = None
            q_emb = None
            if db:
                try:
                    q_emb = await get_embedding(body.message)
                    q_emb_str = f"[{','.join(map(str, q_emb))}]"
                    async with db.acquire() as conn:
                        row = await conn.fetchrow(
                            """
                            SELECT response, 1 - (embedding <=> $1::vector) AS similarity 
                            FROM semantic_cache 
                            WHERE 1 - (embedding <=> $1::vector) > 0.92
                            ORDER BY similarity DESC LIMIT 1
                            """, q_emb_str
                        )
                        if row:
                            cached_response = row["response"]
                            await conn.execute("INSERT INTO ai_logs (endpoint, model, latency_ms) VALUES ('chat_cache_hit', 'cache', 0)")
                except Exception as e:
                    logger.error(f"Cache check failed: {e}")

            if cached_response:
                # Stream cached response
                for chunk in cached_response.split(" "):
                    yield f'data: {json.dumps({"token": chunk + " "})}\n\n'
                    await asyncio.sleep(0.01)
                
                new_db_messages.append({"role": "assistant", "content": cached_response})
                background_tasks.add_task(save_chat_session, db, session_id, user_id, new_db_messages)
                yield "data: [DONE]\n\n"
                return

            selected_model = classify_query_complexity(body.message)

            stream = await client.chat.completions.create(
                model=selected_model,
                messages=messages,
                stream=True,
                tools=CHAT_TOOLS,
                tool_choice="auto",
                temperature=0.7,
                max_tokens=600
            )

            full_reply = ""
            tool_calls_buffer = {}

            async for chunk in stream:
                if await request.is_disconnected():
                    break
                if not getattr(chunk, "choices", None):
                    continue

                delta = chunk.choices[0].delta

                if getattr(delta, "tool_calls", None):
                    for tc in delta.tool_calls:
                        if tc.index not in tool_calls_buffer:
                            tool_calls_buffer[tc.index] = {"id": tc.id, "function": {"name": tc.function.name, "arguments": ""}}
                        if tc.function.arguments:
                            tool_calls_buffer[tc.index]["function"]["arguments"] += tc.function.arguments
                            
                elif getattr(delta, "content", None):
                    full_reply += delta.content
                    yield f'data: {json.dumps({"token": delta.content})}\n\n'

            if tool_calls_buffer:
                formatted_tcs = []
                for _, tc in tool_calls_buffer.items():
                    formatted_tcs.append({
                        "id": tc["id"],
                        "type": "function",
                        "function": {"name": tc["function"]["name"], "arguments": tc["function"]["arguments"]}
                    })
                
                messages.append({"role": "assistant", "content": full_reply or None, "tool_calls": formatted_tcs})
                
                for tc in formatted_tcs:
                    fn_name = tc["function"]["name"]
                    try:
                        args = json.loads(tc["function"]["arguments"])
                    except Exception:
                        args = {}
                    result = await execute_tool(fn_name, args, body.home_id, db)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "name": fn_name,
                        "content": str(result)
                    })
                
                # Second stream for final answer
                stream2 = await client.chat.completions.create(
                    model=selected_model,
                    messages=messages,
                    stream=True,
                    temperature=0.7,
                    max_tokens=600
                )
                
                async for chunk in stream2:
                    if await request.is_disconnected(): break
                    if not getattr(chunk, "choices", None): continue
                    delta = chunk.choices[0].delta
                    if getattr(delta, "content", None):
                        full_reply += delta.content
                        yield f'data: {json.dumps({"token": delta.content})}\n\n'

            # Save ONLY the final clean text to DB — no tool call stubs
            new_db_messages.append({"role": "assistant", "content": full_reply})
            background_tasks.add_task(save_chat_session, db, session_id, user_id, new_db_messages)
            
            # Log AI prompt and response
            latency_ms = int((time.time() - start_time) * 1000)
            if db:
                async with db.acquire() as conn:
                    await conn.execute(
                        """INSERT INTO ai_logs (endpoint, prompt_version, system_prompt, user_input, raw_response, model, latency_ms)
                           VALUES ($1, 'v1', $2, $3, $4, $5, $6)""",
                        "chat_cache_miss", system_prompt, body.message, full_reply, selected_model, latency_ms
                    )
                    # Insert into semantic cache
                    if q_emb:
                        q_emb_str = f"[{','.join(map(str, q_emb))}]"
                        await conn.execute(
                            "INSERT INTO semantic_cache (query, response, embedding) VALUES ($1, $2, $3::vector)",
                            body.message, full_reply, q_emb_str
                        )

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
