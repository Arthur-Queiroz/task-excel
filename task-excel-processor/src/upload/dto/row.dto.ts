import { IsNumber, IsString } from 'class-validator';

export class RowDTO {
  @IsString()
  mes_planejado: string;

  @IsString()
  tarefa: number;

  @IsString()
  etapa: string;

  @IsString()
  ambiente: string;

  @IsString()
  setor: string;

  @IsNumber()
  peso: number;

  @IsNumber()
  pavimento: number;

  @IsNumber()
  sortIndex: number;
}
