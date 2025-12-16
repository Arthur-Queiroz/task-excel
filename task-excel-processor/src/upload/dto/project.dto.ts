import { IsString, IsOptional, IsDateString, IsMongoId, MinLength, MaxLength, IsUrl } from 'class-validator';

export class ProjectDTO {
  @IsString()
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  @MaxLength(200, { message: 'Nome deve ter no máximo 200 caracteres' })
  name: string;

  @IsString()
  @MinLength(1, { message: 'Localização é obrigatória' })
  location: string;

  @IsDateString({}, { message: 'Data de início deve estar no formato YYYY-MM-DD' })
  startDate: string;

  @IsDateString({}, { message: 'Data de conclusão prevista deve estar no formato YYYY-MM-DD' })
  forecastCompletionDate: string;

  @IsMongoId({ message: 'ID da construtora deve ser um ObjectId válido' })
  constructionCompanyId: string;

  @IsOptional()
  @IsUrl({}, { message: 'URL da foto deve ser uma URL válida' })
  photoUrl?: string;
}