import { Injectable } from '@nestjs/common';

@Injectable()
export class MockService {
  async processTask(taskPayload: any): Promise<{ status: string; data: string }> {
    const delay = Math.floor(Math.random() * 3000) + 2000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const randomResult = Math.random() < 0.75 ? 'success' : 'failure';

    if (randomResult === 'success') {
      return {
        status: 'success',
        data: `Processed task with payload: ${JSON.stringify(taskPayload)}`,
      };
    } else {
      throw new Error(`Failed to process task with payload: ${JSON.stringify(taskPayload)}`);
    }
  }
}
