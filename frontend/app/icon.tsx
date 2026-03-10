import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
    return new ImageResponse(
        (
            <svg
                viewBox="0 0 100 100"
                width="32"
                height="32"
                fill="black"
                style={{ color: '#FFAB00' }}
                xmlns="http://www.w3.org/2000/svg"
            >
                <g fill="#FFAB00">
                    <polygon points="28,45 35,45 46,65 37,71" />
                    <polygon points="40,82 50,52 38,52 48,30 42,30 56,18 56,32 66,32 55,52 68,52" />
                    <path
                        d="M 64 52 A 12.5 12.5 0 1 1 50 74"
                        fill="none"
                        stroke="#FFAB00"
                        strokeWidth="5"
                        strokeLinecap="square"
                    />
                    <polygon points="63,68 76,82 63,82" />
                </g>
            </svg>
        ),
        { ...size }
    )
}
