import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  ParseFilePipeBuilder,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { HorsesService } from './horses.service';
import { CreateHorseDto } from './dto/create-horse.dto';
import { UpdateHorseDto } from './dto/update-horse.dto';
import { UpdateOwnershipDto } from './dto/update-ownership.dto';
import { HorsesQueryDto } from './dto/horses-query.dto';
import { TransferHorseDto } from './dto/transfer-horse.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('horses')
@ApiBearerAuth()
@Controller('horses')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
export class HorsesController {
  constructor(private readonly horsesService: HorsesService) {}

  @Post()
  @RequirePermission('horses', 'create')
  create(
    @Body(ValidationPipe) dto: CreateHorseDto,
    @GetUser() user: User,
  ) {
    return this.horsesService.create(dto, user);
  }

  @Get()
  @RequirePermission('horses', 'read')
  findAll(
    @GetUser() user: User,
    @Query(new ValidationPipe({ transform: true })) query: HorsesQueryDto,
  ) {
    return this.horsesService.findAll(user, query);
  }

  @Post(':id/transfer')
  @RequirePermission('horses', 'update')
  transfer(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: TransferHorseDto,
    @GetUser() user: User,
  ) {
    return this.horsesService.transfer(id, dto, user);
  }

  @Get(':id/expenses/export')
  @RequirePermission('horses', 'read')
  async exportExpenses(
    @Param('id') id: string,
    @GetUser() user: User,
    @Res() res: Response,
  ) {
    const csv = await this.horsesService.exportExpenses(id, user);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="gastos-${id}.csv"`);
    res.send('﻿' + csv);
  }

  @Get(':id/financial-summary')
  @RequirePermission('horses', 'read')
  getFinancialSummary(@Param('id') id: string, @GetUser() user: User) {
    return this.horsesService.getFinancialSummary(id, user);
  }

  @Get(':id/ownership')
  @RequirePermission('horses', 'read')
  getOwnership(@Param('id') id: string, @GetUser() user: User) {
    return this.horsesService.getOwnership(id, user);
  }

  @Put(':id/ownership')
  @RequirePermission('horses', 'update')
  updateOwnership(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateOwnershipDto,
    @GetUser() user: User,
  ) {
    return this.horsesService.updateOwnership(id, dto, user);
  }

  @Post(':id/image')
  @RequirePermission('horses', 'update')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 15 * 1024 * 1024 } }))
  uploadImage(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/i })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
    @GetUser() user: User,
  ) {
    return this.horsesService.uploadImage(id, file, user);
  }

  @Delete(':id/image')
  @RequirePermission('horses', 'update')
  removeImage(@Param('id') id: string, @GetUser() user: User) {
    return this.horsesService.removeImage(id, user);
  }

  @Get(':id')
  @RequirePermission('horses', 'read')
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.horsesService.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermission('horses', 'update')
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateHorseDto,
    @GetUser() user: User,
  ) {
    return this.horsesService.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermission('horses', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.horsesService.remove(id, user);
  }
}
