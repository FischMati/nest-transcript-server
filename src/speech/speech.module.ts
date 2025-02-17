import { Module } from '@nestjs/common';
import { SpeechService } from './speech.service';
import { SpeechGateway } from './speech.gateway';


@Module({
  providers: [SpeechService, SpeechGateway],
})
export class SpeechModule { }
