import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO de entrada dos filtros de listagem de pedidos (query params).
 */
export class FilterOrdersDto {
  @ApiPropertyOptional({ example: '2026-08-01', description: 'Data início (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional({ example: '2026-08-31', description: 'Data fim (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @ApiPropertyOptional({ example: 20, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valorMin?: number;

  @ApiPropertyOptional({ example: 100, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valorMax?: number;

  @ApiPropertyOptional({ example: 'Ana', description: 'Busca por substring, case-insensitive' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nomeCliente?: string;
}
