import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { ProjectsUploadController } from './projects-upload.controller';
import { TasksUploadController } from './tasks-upload.controller';
import { UploadService } from './upload.service';
import { ExcelProcessor } from './excel.processor';
import { TaskProcessor } from './task.processor';
import { ApiService } from './services/api.service';

@Module({
  controllers: [UploadController, ProjectsUploadController, TasksUploadController],
  providers: [UploadService, ExcelProcessor, TaskProcessor, ApiService],
})
export class UploadModule {}
