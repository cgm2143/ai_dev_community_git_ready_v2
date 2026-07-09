import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailConfig } from '../../config/configuration';
import { MAIL_TRANSPORTER } from './mailer.constants';
import { MailerService } from './mailer.service';

const transporterProvider = {
  provide: MAIL_TRANSPORTER,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const mailConfig = configService.get<MailConfig>('mail');
    return nodemailer.createTransport({
      host: mailConfig?.host,
      port: mailConfig?.port,
      secure: mailConfig?.secure,
      auth: {
        user: mailConfig?.user,
        pass: mailConfig?.password,
      },
    });
  },
};

@Module({
  providers: [transporterProvider, MailerService],
  exports: [MailerService],
})
export class MailerModule {}
