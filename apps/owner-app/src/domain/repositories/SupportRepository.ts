import { MediaInput, Notice, Report } from "../models";
export interface SupportRepository {
  notifications(): Promise<Notice[]>;
  markRead(id: string): Promise<void>;
  reports(): Promise<Report[]>;
  report(
    input: Pick<
      Report,
      "target_type" | "target_id" | "category" | "description"
    > & { evidence_path: string },
  ): Promise<void>;
  registerPush(
    token: string,
    platform: "ANDROID" | "IOS",
    installation: string,
  ): Promise<void>;
  setPushEnabled(enabled: boolean): Promise<void>;
  upload(input: MediaInput): Promise<string>;
  mediaUrl(path: string): Promise<string>;
}
