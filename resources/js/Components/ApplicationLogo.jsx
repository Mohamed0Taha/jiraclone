export default function ApplicationLogo(props) {
    return (
        <svg {...props} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            {/* Background circle with gradient */}
            <defs>
                <linearGradient id="taskPilotGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4F46E5" />
                    <stop offset="50%" stopColor="#7C3AED" />
                    <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
                <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="100%" stopColor="#F3F4F6" />
                </linearGradient>
            </defs>

            {/* Main background circle */}
            <circle
                cx="100"
                cy="100"
                r="95"
                fill="url(#taskPilotGradient)"
                stroke="#FFFFFF"
                strokeWidth="2"
            />

            {/* Navigation compass rose */}
            <g transform="translate(100,100)">
                {/* Main compass points */}
                <line
                    x1="0"
                    y1="-70"
                    x2="0"
                    y2="-50"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                    strokeLinecap="round"
                />
                <line
                    x1="70"
                    y1="0"
                    x2="50"
                    y2="0"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                    strokeLinecap="round"
                />
                <line
                    x1="0"
                    y1="70"
                    x2="0"
                    y2="50"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                    strokeLinecap="round"
                />
                <line
                    x1="-70"
                    y1="0"
                    x2="-50"
                    y2="0"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                    strokeLinecap="round"
                />

                {/* Diagonal compass points */}
                <line
                    x1="50"
                    y1="-50"
                    x2="35"
                    y2="-35"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <line
                    x1="50"
                    y1="50"
                    x2="35"
                    y2="35"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <line
                    x1="-50"
                    y1="50"
                    x2="-35"
                    y2="35"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <line
                    x1="-50"
                    y1="-50"
                    x2="-35"
                    y2="-35"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
            </g>

            {/* Task checkmarks in a circular pattern */}
            <g transform="translate(100,100)">
                {/* Checkmark 1 - top right */}
                <g transform="translate(30,-30) scale(0.8)">
                    <circle r="12" fill="#FFFFFF" fillOpacity="0.9" />
                    <path
                        d="M-4,0 L-1,3 L4,-3"
                        stroke="#4F46E5"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </g>

                {/* Checkmark 2 - right */}
                <g transform="translate(45,10) scale(0.8)">
                    <circle r="12" fill="#FFFFFF" fillOpacity="0.9" />
                    <path
                        d="M-4,0 L-1,3 L4,-3"
                        stroke="#4F46E5"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </g>

                {/* Checkmark 3 - bottom */}
                <g transform="translate(10,45) scale(0.8)">
                    <circle r="12" fill="#FFFFFF" fillOpacity="0.9" />
                    <path
                        d="M-4,0 L-1,3 L4,-3"
                        stroke="#4F46E5"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </g>

                {/* Checkmark 4 - left */}
                <g transform="translate(-40,5) scale(0.8)">
                    <circle r="12" fill="#FFFFFF" fillOpacity="0.8" />
                    <path
                        d="M-4,0 L-1,3 L4,-3"
                        stroke="#4F46E5"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </g>
            </g>

            {/* Central navigation arrow pointing northeast (suggesting progress/direction) */}
            <g transform="translate(100,100) rotate(45)">
                <path
                    d="M-15,5 L15,5 L10,10 M15,5 L10,0 M-15,5 L-15,-15 L15,-15"
                    stroke="url(#arrowGradient)"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </g>

            {/* Central dot */}
            <circle cx="100" cy="100" r="4" fill="#FFFFFF" />
        </svg>
    );
}
