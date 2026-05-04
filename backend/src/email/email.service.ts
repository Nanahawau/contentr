import { Inject, Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigType } from '@nestjs/config';
import emailConfig from 'src/config/email.config';

@Injectable()
export class EmailService {
  constructor(
    private readonly mailerService: MailerService,
    @Inject(emailConfig.KEY)
    private readonly emailConfiguration: ConfigType<typeof emailConfig>,
  ) {}

  async sendVerificationEmail(
    to: string,
    verificationUrl: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to,
      subject: 'Verify your Contentr email',
      template: 'verify-email',
      context: { verificationUrl },
    });
  }
}
