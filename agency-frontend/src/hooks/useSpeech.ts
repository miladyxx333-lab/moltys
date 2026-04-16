
import { useState, useEffect, useCallback, useRef } from 'react';

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export const useSpeech = (onTextRecognized?: (text: string) => void) => {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);

    const recognitionRef = useRef<any>(null);
    const isSpeakingRef = useRef(false);
    const isVoiceEnabledRef = useRef(true);
    const onTextRecognizedRef = useRef(onTextRecognized);
    const ignoreAudioRef = useRef(false);

    useEffect(() => {
        onTextRecognizedRef.current = onTextRecognized;
    }, [onTextRecognized]);

    useEffect(() => {
        isSpeakingRef.current = isSpeaking;
    }, [isSpeaking]);

    useEffect(() => {
        isVoiceEnabledRef.current = isVoiceEnabled;
    }, [isVoiceEnabled]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognitionInstance = new SpeechRecognition();
                recognitionInstance.continuous = true;
                recognitionInstance.interimResults = true;
                recognitionInstance.lang = 'es-MX'; 

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
    }, []); 

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

        // Asegurar que las voces carguen
        if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.onvoiceschanged = () => speakText(text);
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'es-MX';
        utterance.pitch = 1.3;
        utterance.rate = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const spanishVoice = voices.find(v => v.lang.includes('es-') || v.lang === 'es-MX');
        if (spanishVoice) {
            utterance.voice = spanishVoice;
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

    }, [isListening]);

    const toggleVoice = () => setIsVoiceEnabled(prev => !prev);

    useEffect(() => {
        window.speechSynthesis.getVoices();
    }, []);

    return { isListening, isSpeaking, isVoiceEnabled, toggleVoice, toggleListening, stopListening, speakText };
};
