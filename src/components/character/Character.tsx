import React from 'react';

export type Gender = 'male' | 'female';
export type Expression = 'idle' | 'happy' | 'sad' | 'questioning' | 'excited';

interface CharacterProps {
    gender: Gender;
    expression: Expression;
    equippedCostume?: string;
    equippedCostumeUrl?: string; // New: support image-based costumes
    costumeItem?: any; // the full shop item object
    className?: string;
}

export function Character({ gender, expression, equippedCostume, equippedCostumeUrl, costumeItem, className = "" }: CharacterProps) {
    // Colors
    const skinColor = "#fcd5ce";
    const hairColor = gender === 'male' ? "#4a4e69" : "#9a031e";
    const eyeColor = "#22223b";

    // SVGs for different expressions
    const renderEyes = () => {
        switch (expression) {
            case 'happy':
                return (
                    <g>
                        <path d="M 35 45 Q 40 40 45 45" stroke={eyeColor} strokeWidth="3" fill="none" strokeLinecap="round" />
                        <path d="M 55 45 Q 60 40 65 45" stroke={eyeColor} strokeWidth="3" fill="none" strokeLinecap="round" />
                    </g>
                );
            case 'sad':
                return (
                    <g>
                        <path d="M 35 45 Q 40 40 45 45" stroke={eyeColor} strokeWidth="3" fill="none" strokeLinecap="round" />
                        <path d="M 55 45 Q 60 40 65 45" stroke={eyeColor} strokeWidth="3" fill="none" strokeLinecap="round" />
                        {/* Tears */}
                        <circle cx="38" cy="55" r="2" fill="#48cae4" />
                        <circle cx="62" cy="55" r="2" fill="#48cae4" />
                    </g>
                );
            case 'questioning':
                return (
                    <g>
                        <circle cx="40" cy="45" r="3.5" fill={eyeColor} />
                        <circle cx="60" cy="45" r="3.5" fill={eyeColor} />
                        {/* Raised eyebrow */}
                        <path d="M 35 38 Q 40 33 45 38" stroke={eyeColor} strokeWidth="2" fill="none" strokeLinecap="round" />
                        <path d="M 55 35 Q 60 30 65 35" stroke={eyeColor} strokeWidth="2" fill="none" strokeLinecap="round" />
                    </g>
                );
            case 'excited':
                return (
                    <g>
                        {/* Star eyes */}
                        <polygon points="40,38 42,43 47,43 43,46 45,51 40,48 35,51 37,46 33,43 38,43" fill="#ffb703" />
                        <polygon points="60,38 62,43 67,43 63,46 65,51 60,48 55,51 57,46 53,43 58,43" fill="#ffb703" />
                    </g>
                );
            case 'idle':
            default:
                return (
                    <g>
                        <circle cx="40" cy="45" r="3.5" fill={eyeColor} />
                        <circle cx="60" cy="45" r="3.5" fill={eyeColor} />
                    </g>
                );
        }
    };

    const renderMouth = () => {
        switch (expression) {
            case 'happy':
                return <path d="M 40 60 Q 50 70 60 60" stroke={eyeColor} strokeWidth="3" fill="none" strokeLinecap="round" />;
            case 'sad':
                return <path d="M 40 65 Q 50 55 60 65" stroke={eyeColor} strokeWidth="3" fill="none" strokeLinecap="round" />;
            case 'questioning':
                return <circle cx="50" cy="62" r="3" fill={eyeColor} />;
            case 'excited':
                return <path d="M 35 60 Q 50 75 65 60 Z" fill="#d90429" stroke={eyeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />;
            case 'idle':
            default:
                return <path d="M 42 62 Q 50 65 58 62" stroke={eyeColor} strokeWidth="2" fill="none" strokeLinecap="round" />;
        }
    };

    const renderHair = () => {
        if (gender === 'male') {
            return (
                <path d="M 25 40 Q 25 15 50 15 Q 75 15 75 40 Q 70 25 50 25 Q 30 25 25 40 Z" fill={hairColor} />
            );
        } else {
            return (
                <g>
                    {/* Back hair */}
                    <path d="M 20 40 L 20 80 Q 50 90 80 80 L 80 40 Z" fill={hairColor} />
                    {/* Front bangs */}
                    <path d="M 20 45 Q 25 15 50 15 Q 75 15 80 45 Q 65 25 50 25 Q 35 25 20 45 Z" fill={hairColor} />
                </g>
            );
        }
    };

    const renderCostume = () => {
        switch (equippedCostume) {
            case 'scarf':
                return (
                    <path d="M 25 75 Q 50 90 75 75 L 80 85 L 65 95 L 35 95 L 20 85 Z" fill="#e63946" />
                );
            case 'beanie':
                return (
                    <g>
                        <path d="M 20 35 Q 50 -10 80 35 Q 50 25 20 35 Z" fill="#1d3557" />
                        <circle cx="50" cy="5" r="8" fill="#a8dadc" />
                    </g>
                );
            case 'coat':
                return (
                    <g>
                        <path d="M 20 80 L 10 100 L 90 100 L 80 80 Z" fill="#bc6c25" />
                        <path d="M 40 80 L 40 100 M 60 80 L 60 100" stroke="#dda15e" strokeWidth="2" />
                    </g>
                );
            case 'goggles':
                return (
                    <g>
                        <path d="M 15 30 L 85 30 L 85 40 L 15 40 Z" fill="#457b9d" />
                        <rect x="25" y="25" width="20" height="15" rx="5" fill="#f4a261" stroke="#264653" strokeWidth="2" />
                        <rect x="55" y="25" width="20" height="15" rx="5" fill="#f4a261" stroke="#264653" strokeWidth="2" />
                    </g>
                );
            default:
                return null;
        }
    };

    return (
        <div className={`relative ${className}`}>
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
                {/* Body (for coat mainly) */}
                <path d="M 25 100 C 25 80, 75 80, 75 100 Z" fill={equippedCostume === 'coat' ? 'transparent' : '#a8dadc'} />
                
                {/* Hair (back) */}
                {gender === 'female' && <path d="M 20 40 L 20 80 Q 50 90 80 80 L 80 40 Z" fill={hairColor} />}

                {/* Head */}
                <circle cx="50" cy="50" r="30" fill={skinColor} />
                
                {/* Features */}
                {renderEyes()}
                {renderMouth()}
                
                {/* Hair (front) */}
                <path d="M 20 45 Q 25 15 50 15 Q 75 15 80 45 Q 65 25 50 25 Q 35 25 20 45 Z" fill={hairColor} />
                {gender === 'male' && <path d="M 25 40 Q 25 15 50 15 Q 75 15 75 40 Q 70 25 50 25 Q 30 25 25 40 Z" fill={hairColor} />}

                {/* Blush */}
                {(expression === 'happy' || expression === 'excited') && (
                    <g opacity="0.3">
                        <circle cx="28" cy="55" r="4" fill="#ff4d6d" />
                        <circle cx="72" cy="55" r="4" fill="#ff4d6d" />
                    </g>
                )}

                {/* Costume SVG (legacy built-in svgs) */}
                {!equippedCostumeUrl && !costumeItem?.icon && renderCostume()}

                {/* Costume Emoji (if no image and no built-in match, use emoji) */}
                {!equippedCostumeUrl && costumeItem?.icon && !costumeItem?.imageUrl && (
                    <text x="50" y="80" fontSize="30" textAnchor="middle">{costumeItem.icon}</text>
                )}

                {/* Costume Image (if any) */}
                {(equippedCostumeUrl || costumeItem?.imageUrl) && (
                    <image href={equippedCostumeUrl || costumeItem?.imageUrl} x="20" y="50" width="60" height="60" preserveAspectRatio="xMidYMid meet" />
                )}
            </svg>
        </div>
    );
}
