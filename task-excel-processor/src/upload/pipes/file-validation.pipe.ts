import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly maxSizeInBytes: number = 10 * 1024 * 1024; // 10MB
  private readonly allowedExtensions: string[] = ['.xlsx', '.xls'];

  transform(file: any) {
    if (!file) {
      throw new BadRequestException({
        success: false,
        error: 'ARQUIVO_OBRIGATORIO',
        message: 'Arquivo é obrigatório',
      });
    }

    // Validar extensão
    const fileName = file.originalname.toLowerCase();
    const hasValidExtension = this.allowedExtensions.some((ext) =>
      fileName.endsWith(ext),
    );

    if (!hasValidExtension) {
      throw new BadRequestException({
        success: false,
        error: 'EXTENSAO_INVALIDA',
        message: `Apenas arquivos Excel (.xlsx, .xls) são permitidos. Arquivo recebido: ${file.originalname}`,
        allowedExtensions: this.allowedExtensions,
      });
    }

    // Validar tamanho
    if (file.size > this.maxSizeInBytes) {
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
      const maxSizeInMB = (this.maxSizeInBytes / (1024 * 1024)).toFixed(0);
      throw new BadRequestException({
        success: false,
        error: 'ARQUIVO_MUITO_GRANDE',
        message: `O arquivo é muito grande. Tamanho: ${sizeInMB}MB. Tamanho máximo: ${maxSizeInMB}MB`,
        fileSize: file.size,
        maxSize: this.maxSizeInBytes,
      });
    }

    return file;
  }
}


