import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class SmsService {
  private client;
  constructor(private configService: ConfigService) {
    this.client = twilio(
      this.configService.get('TWILIO_ACCOUNT_SID'),
      this.configService.get('TWILIO_AUTH_TOKEN'),
    );
  }

  /**
   * Send sms message to a phone number.
   * The function expect a valid number
   */
  async sendMessage(phone: string, message: string) {
    const myPhone: string = this.configService.get('PERSONAL_PHONE');

    if (phone !== myPhone) {
      console.log(
        'Cannot send message to another phone, the message will be redirected to my personal phone',
      );
    }
    const msg = await this.client.messages.create({
      from: this.configService.get('TWILIO_PHONE'),
      to: myPhone,
      body: message,
    });

    //wont throw error because i am always using my phone number and it will always pass
    if (!msg.sid || msg.status === 'failed') {
      throw new Error('Error sending sms to phone: ' + phone);
    }
  }
}
