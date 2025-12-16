import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ExcelProcessor } from './excel.processor';
import { ApiConfig } from './interfaces/api-config.interface';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly processor: ExcelProcessor) {}

  async processFile(file: any, apiConfig?: ApiConfig) {
    try {
      this.logger.log(`Processando arquivo: ${file.originalname}`);

      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);

      this.logger.log(`Arquivo processado: ${json.length} linhas encontradas`);

      return await this.processor.handle(json, apiConfig);
    } catch (error) {
      this.logger.error('Erro ao processar arquivo:', error.message);
      throw new Error(`Erro ao processar arquivo: ${error.message}`);
    }
  }

  async processFileWithApi(
    file: any,
    baseUrl: string,
    endpoint: string,
    token: string,
  ) {
    const apiConfig: ApiConfig = {
      baseUrl,
      endpoint,
      token,
    };

    return this.processFile(file, apiConfig);
  }
}
