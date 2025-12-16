import {
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StageDTO } from './stage.dto';

export class TaskDTO {
  @IsString()
  towerId: string;

  @IsString()
  sector: string;

  @IsString()
  title: string;

  @IsString()
  scheduleDate: string;

  @IsString()
  statusDate: string;

  @IsNumber()
  floorNumber: number;

  @IsString()
  @IsOptional()
  observation?: string;

  @IsBoolean()
  done: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  completionPercentage: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StageDTO)
  stages: StageDTO[];
}

