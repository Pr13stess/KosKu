export interface CallMediaProps {
  callId: string;
  video: boolean;
  onError?: (message: string) => void;
}
