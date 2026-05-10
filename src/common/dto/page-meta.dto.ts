import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber } from 'class-validator';

import type { PageOptionsDto } from './page-options.dto.js';

interface IPageMetaDtoParameters {
  pageOptionsDto: PageOptionsDto;
  itemCount: number;
}

export class PageMetaDto {
  @ApiProperty()
  @IsNumber()
  readonly page: number;

  @ApiProperty()
  @IsNumber()
  readonly take: number;

  @ApiProperty()
  @IsNumber()
  readonly itemCount: number;

  @ApiProperty()
  @IsNumber()
  readonly pageCount: number;

  @ApiProperty()
  @IsBoolean()
  readonly hasPreviousPage: boolean;

  @ApiProperty()
  @IsBoolean()
  readonly hasNextPage: boolean;

  constructor({ pageOptionsDto, itemCount }: IPageMetaDtoParameters) {
    this.page = pageOptionsDto.page;
    this.take = pageOptionsDto.take;
    this.itemCount = itemCount;
    this.pageCount = Math.ceil(this.itemCount / this.take);
    this.hasPreviousPage = this.page > 1;
    this.hasNextPage = this.page < this.pageCount;
  }
}
