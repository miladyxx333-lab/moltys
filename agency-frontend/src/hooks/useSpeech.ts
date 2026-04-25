
import { useState, useEffect, useCallback, useRef } from 'react';

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

// Map our language codes to BCP 47 locale tags
const SPEECH_LOCALE: Record<string, string> = {
    en: 'en-US',
    es: 'es-MX',
    pt: 'pt-BR'
};

export const useSpeech = (onTextRecognized?: (text: string) => void, lang: string = 'es') => {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);

    const recognitionRef = useRef<any>(null);
    const isSpeakingRef = useRef(false);
    const isVoiceEnabledRef = useRef(true);
    const onTextRecognizedRef = useRef(onTextRecognized);
    const ignoreAudioRef = useRef(false);
    const currentLocale = SPEECH_LOCALE[lang] || 'es-MX';

    useEffect(() => {
        onTextRecognizedRef.current = onTextRecognized;
    }, [onTextRecognized]);

    useEffect(() => {
        isSpeakingRef.current = isSpeaking;
    }, [isSpeaking]);

    useEffect(() => {
        isVoiceEnabledRef.current = isVoiceEnabled;
    }, [isVoiceEnabled]);

    // Rebuild recognition when language changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                // Clean up previous instance
                if (recognitionRef.current) {
                    try { recognitionRef.current.abort(); } catch (e) {}
                }

                const recognitionInstance = new SpeechRecognition();
                recognitionInstance.continuous = true;
                recognitionInstance.interimResults = true;
                recognitionInstance.lang = currentLocale;

                recognitionInstance.onstart = () => {
                    setIsListening(true);
                };

                recognitionInstance.onresult = (event: any) => {
                    if (isSpeakingRef.current || ignoreAudioRef.current) return;

                    let finalTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        }
                    }
                    if (finalTranscript && onTextRecognizedRef.current) {
                        onTextRecognizedRef.current(finalTranscript);
                    }
                };

                recognitionInstance.onerror = (event: any) => {
                    console.error('Speech recognition error', event.error);
                    setIsListening(false);
                };

                recognitionInstance.onend = () => {
                    setIsListening(false);
                };

                recognitionRef.current = recognitionInstance;

                return () => {
                    try {
                        recognitionInstance.abort();
                    } catch (e) {
                        console.error(e);
                    }
                };
            }
        }
    }, [currentLocale]);

    const toggleListening = useCallback(() => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            try {
                ignoreAudioRef.current = false;
                recognitionRef.current?.start();
                setIsListening(true);
            } catch (e) {
                console.error(e);
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        }
    }, [isListening]);

    const speakText = useCallback((text: string) => {
        if (!isVoiceEnabledRef.current) return;
        if (!('speechSynthesis' in window)) return;

        const cleanText = text.replace(/\[.*?\]/g, '').replace(/\*|#|`|_/g, '').trim();
        if (!cleanText) return;

        // Ensure voices are loaded
        if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.onvoiceschanged = () => speakText(text);
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = currentLocale;
        utterance.pitch = 1.3;
        utterance.rate = 1.0;

        // Find a voice matching the current language
        const voices = window.speechSynthesis.getVoices();
        const langPrefix = currentLocale.split('-')[0]; // 'en', 'es', 'pt'
        const matchingVoice = voices.find(v => v.lang === currentLocale) ||
                              voices.find(v => v.lang.startsWith(langPrefix + '-')) ||
                              voices.find(v => v.lang.startsWith(langPrefix));
        if (matchingVoice) {
            utterance.voice = matchingVoice;
        }

        ignoreAudioRef.current = true;

        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        }

        utterance.onstart = () => {
            setIsSpeaking(true);
            ignoreAudioRef.current = true;
        };

        utterance.onend = () => {
            setIsSpeaking(false);
            setTimeout(() => { ignoreAudioRef.current = false; }, 1200);
        };

        utterance.onerror = () => {
            setIsSpeaking(false);
            setTimeout(() => { ignoreAudioRef.current = false; }, 1200);
        };

        setTimeout(() => {
            window.speechSynthesis.speak(utterance);
        }, 50);

    }, [isListening, currentLocale]);

    const toggleVoice = () => setIsVoiceEnabled(prev => !prev);

    useEffect(() => {
        window.speechSynthesis.getVoices();
    }, []);

    return { isListening, isSpeaking, isVoiceEnabled, toggleVoice, toggleListening, stopListening, speakText };
};
