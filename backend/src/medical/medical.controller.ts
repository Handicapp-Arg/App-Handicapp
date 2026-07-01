import { Controller, Get, Post, Delete, Param, Body, Res, UseGuards, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MedicalService } from './medical.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';

@ApiTags('medical')
@ApiBearerAuth()
@Controller('horses/:horseId/medical')
@UseGuards(AuthGuard('jwt'))
export class MedicalController {
  constructor(private readonly medicalService: MedicalService) {}

  @Get()
  findAll(@Param('horseId') horseId: string, @GetUser() user: User) {
    return this.medicalService.findByHorse(horseId, user);
  }

  @Post()
  create(
    @Param('horseId') horseId: string,
    @Body(ValidationPipe) dto: CreateMedicalRecordDto,
    @GetUser() user: User,
  ) {
    return this.medicalService.create(horseId, dto, user);
  }

  @Get('health-book')
  getHealthBook(@Param('horseId') horseId: string, @GetUser() user: User) {
    return this.medicalService.getHealthBook(horseId, user);
  }

  @Get('pdf')
  async downloadPdf(
    @Param('horseId') horseId: string,
    @GetUser() user: User,
    @Res() res: Response,
  ) {
    const { pdf, filename } = await this.medicalService.generateMedicalPdf(horseId, user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdf.length,
    });
    res.end(Buffer.from(pdf));
  }

  @Get('health-certificate')
  async downloadHealthCertificate(
    @Param('horseId') horseId: string,
    @GetUser() user: User,
    @Res() res: Response,
  ) {
    const { pdf, filename } = await this.medicalService.generateHealthCertificatePdf(horseId, user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdf.length,
    });
    res.end(Buffer.from(pdf));
  }

  @Delete(':recordId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('horseId') horseId: string,
    @Param('recordId') recordId: string,
    @GetUser() user: User,
  ) {
    return this.medicalService.remove(horseId, recordId, user);
  }
}
