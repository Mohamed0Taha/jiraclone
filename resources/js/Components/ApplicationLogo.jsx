export default function ApplicationLogo(props) {
    return (
        <svg {...props} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            {/* Background circle with gradient */}
            <defs>
                <linearGradient id="taskPilotBg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#87CEEB" />
                    <stop offset="50%" stopColor="#5DADE2" />
                    <stop offset="100%" stopColor="#3498DB" />
                </linearGradient>
                <linearGradient id="helmetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34495E" />
                    <stop offset="100%" stopColor="#2C3E50" />
                </linearGradient>
                <linearGradient id="visorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#5D6D7E" />
                    <stop offset="100%" stopColor="#34495E" />
                </linearGradient>
            </defs>

            {/* Main background circle */}
            <circle
                cx="100"
                cy="100"
                r="95"
                fill="url(#taskPilotBg)"
                stroke="#2C3E50"
                strokeWidth="3"
            />

            {/* Pilot Character */}
            {/* Helmet base */}
            <ellipse
                cx="100"
                cy="85"
                rx="65"
                ry="50"
                fill="url(#helmetGradient)"
                stroke="#1B2631"
                strokeWidth="2"
            />

            {/* Helmet side straps */}
            <path
                d="M45 105 Q65 115 85 110 Q100 108 115 110 Q135 115 155 105"
                stroke="#1B2631"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
            />

            {/* Visor/Goggles */}
            <ellipse
                cx="100"
                cy="75"
                rx="55"
                ry="18"
                fill="url(#visorGradient)"
                stroke="#1B2631"
                strokeWidth="2"
            />

            {/* Goggle frames */}
            <circle cx="75" cy="75" r="20" fill="none" stroke="#1B2631" strokeWidth="3"/>
            <circle cx="125" cy="75" r="20" fill="none" stroke="#1B2631" strokeWidth="3"/>

            {/* Face/Beak area */}
            <ellipse
                cx="100"
                cy="125"
                rx="35"
                ry="25"
                fill="#ECF0F1"
                stroke="#BDC3C7"
                strokeWidth="2"
            />

            {/* Duck beak */}
            <ellipse
                cx="85"
                cy="125"
                rx="12"
                ry="6"
                fill="#F39C12"
                stroke="#E67E22"
                strokeWidth="1"
            />

            {/* Eye */}
            <circle cx="110" cy="120" r="4" fill="#2C3E50"/>
            <circle cx="111" cy="119" r="1" fill="#FFFFFF"/>

            {/* TaskPilot badge on helmet */}
            <circle cx="100" cy="55" r="15" fill="#E74C3C" stroke="#C0392B" strokeWidth="2"/>
            <text 
                x="100" 
                y="62" 
                fontFamily="system-ui, -apple-system, sans-serif" 
                fontSize="12" 
                fontWeight="800" 
                textAnchor="middle" 
                fill="white"
            >
                TP
            </text>

            {/* Helmet shine/highlight */}
            <ellipse
                cx="80"
                cy="65"
                rx="15"
                ry="8"
                fill="#FFFFFF"
                opacity="0.3"
            />
        </svg>
    );
}
