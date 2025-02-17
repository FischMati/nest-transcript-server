import { Module } from '@nestjs/common';
import { SpeechModule } from './speech/speech.module';

@Module({
  imports: [SpeechModule],
})
export class AppModule { }
