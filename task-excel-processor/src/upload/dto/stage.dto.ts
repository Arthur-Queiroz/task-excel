import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MeasurementDateDTO {
  @IsString()
  date: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  measuredPercentage: number;

  @IsString()
  measuredBy: string;
}

export class StageDTO {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  weight: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  completionPercentage?: number;

  @IsString()
  scheduleDate: string;

  @IsString()
  environment: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeasurementDateDTO)
  @IsOptional()
  measurementDates?: MeasurementDateDTO[];
}

