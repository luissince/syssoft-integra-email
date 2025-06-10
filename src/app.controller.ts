import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags } from '@nestjs/swagger';
import { BodyDto } from './dto/body.dto';

@ApiTags('Root')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Post('send')
  async sendMail(@Body() body: BodyDto): Promise<string> {
    return await this.appService.sendMail(body);
  }

  @Get('emails')
  async listEmails(): Promise<any[]> {
    return await this.appService.listEmails();
  }

  @Get('emails/user')
  async listEmailsByUser(@Query('email') email: string): Promise<any[]> {
    return await this.appService.listEmailsByUser(email);
  }
}
