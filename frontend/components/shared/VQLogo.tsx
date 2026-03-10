import React from 'react';

export function VQLogo({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={className}
            fill="currentColor"
            style={{ color: '#FFAB00' }} // The authentic amber glow color
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <filter id="vqNeonGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur1" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur2" />
                    <feMerge>
                        <feMergeNode in="blur2" />
                        <feMergeNode in="blur1" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            <g filter="url(#vqNeonGlow)">
                {/* V Left Arm */}
                <polygon points="28,45 35,45 46,65 37,71" />

                {/* Lightning Bolt */}
                <polygon points="40,82 50,52 38,52 48,30 42,30 56,18 56,32 66,32 55,52 68,52" />

                {/* Q internal curve */}
                <path
                    d="M 64 52 A 12.5 12.5 0 1 1 50 74"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="square"
                />

                {/* Q tail arrow */}
                <polygon points="63,68 76,82 63,82" />
            </g>
        </svg>
    );
}
