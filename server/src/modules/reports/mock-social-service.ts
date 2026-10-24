import { logger } from '../../common/logger';

export interface RawExternalSocialPost {
  post_id: string;
  raw_text: string;
  user_handle: string;
  timestamp: string;
  platform: string;
}

export class MockSocialService {
  private simulateFailure = false;

  public setSimulateFailure(shouldFail: boolean): void {
    this.simulateFailure = shouldFail;
    logger.warn(`[MockSocialService] Failure simulation flag set to: ${shouldFail}`);
  }

  /**
   * Simulates fetching unstructured real-time posts from external social media networks.
   * Includes simulated 60ms network latency.
   */
  public async fetchRawSocialPosts(disasterId: string, locationName: string): Promise<RawExternalSocialPost[]> {
    // Simulated network delay
    await new Promise((resolve) => setTimeout(resolve, 60));

    if (this.simulateFailure) {
      throw new Error('Downstream social media API gateway timeout (HTTP 504 Simulated Gateway Timeout)');
    }

    // Generate dynamic situational social reports based on location
    return [
      {
        post_id: `ext_post_${Date.now()}_1`,
        raw_text: `Urgent: Clean drinking water needed near ${locationName}. Power lines are currently down.`,
        user_handle: 'citizen_nyc_alert',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        platform: 'mock_twitter',
      },
      {
        post_id: `ext_post_${Date.now()}_2`,
        raw_text: `Red cross volunteers setting up cots and dry supplies at local shelter in ${locationName}.`,
        user_handle: 'relief_volunteer_bob',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        platform: 'mock_twitter',
      },
      {
        post_id: `ext_post_${Date.now()}_3`,
        raw_text: `Roads partially blocked around ${locationName} south entrance due to debris and flash waters.`,
        user_handle: 'traffic_updates_live',
        timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        platform: 'mock_mastodon',
      },
    ];
  }
}

export const mockSocialService = new MockSocialService();
