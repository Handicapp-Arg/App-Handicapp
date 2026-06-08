import {
  Controller, Get, Post, Param, Query, Body,
  UseGuards, Request, ParseUUIDPipe, ParseIntPipe,
  DefaultValuePipe, HttpCode, HttpStatus,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { HorseRecordsService } from './horse-records.service';
import { HorseRecordsScrapingService } from './horse-records-scraping.service';
import { SearchRecordsDto } from './dto/search-records.dto';
import { SubmitClaimDto } from './dto/submit-claim.dto';
import { HorseRecordsBootstrapService } from './horse-records-bootstrap.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('horse-records')
export class HorseRecordsController {
  constructor(
    private readonly service: HorseRecordsService,
    private readonly scraping: HorseRecordsScrapingService,
    private readonly bootstrap: HorseRecordsBootstrapService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // ─── Búsqueda pública (solo DB, sin scraping on-demand) ──────────────────
  @Get('search')
  search(@Query() dto: SearchRecordsDto) {
    return this.service.search(dto);
  }

  // ─── Stats de registros ───────────────────────────────────────────────────
  @Get('stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  getStats() {
    return this.service.getStats();
  }

  // ─── Cola de scraping ─────────────────────────────────────────────────────
  @Get('scrape-queue')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  getQueueStats() {
    return this.scraping.getQueueStats();
  }

  // ─── Jobs de import — todos ───────────────────────────────────────────────
  @Get('admin/import-jobs')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  getImportJobs() {
    return this.scraping.getAllJobs();
  }

  // ─── Jobs de import — progreso de uno ────────────────────────────────────
  @Get('admin/import-jobs/:jobId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  getImportJobProgress(@Param('jobId') jobId: string) {
    const job = this.scraping.getJobProgress(jobId);
    if (!job) return { error: 'Job not found' };
    return job;
  }

  // ─── Trigger importación completa (todos los libros + pedigrí profundo) ──
  @Post('admin/full-import')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.ACCEPTED)
  async fullImport() {
    const jobId = await this.scraping.fullImportAll();
    return { jobId, message: 'Importación completa iniciada en background' };
  }

  // ─── Trigger import Studbook AR ───────────────────────────────────────────
  @Post('admin/import-studbook-ar')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.ACCEPTED)
  async importStudbookAR() {
    const jobId = await this.scraping.bulkImportFromStudbookAR();
    return { jobId, message: 'Import iniciado en background' };
  }

  // ─── Trigger import Wikidata ──────────────────────────────────────────────
  @Post('admin/import-wikidata')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.ACCEPTED)
  async importWikidata(
    @Body('minYear') minYear = 1990,
    @Body('maxYear') maxYear = 2020,
  ) {
    const jobId = await this.scraping.bulkImportFromWikidata(minYear, maxYear);
    return { jobId, minYear, maxYear };
  }

  // ─── Re-run bootstrap ─────────────────────────────────────────────────────
  @Post('admin/reseed')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.ACCEPTED)
  reseed() {
    (this.bootstrap as any).seedInBackground().catch(() => {});
    return { message: 'Reseed iniciado en background' };
  }

  // ─── Reset todos los fallidos ─────────────────────────────────────────────
  @Post('admin/retry-failed')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.ACCEPTED)
  retryFailed() {
    return this.scraping.retryAllFailed();
  }

  // ─── Re-scrape individual ─────────────────────────────────────────────────
  @Post(':id/rescrape')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.ACCEPTED)
  rescrapeOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.scraping.rescrapeOne(id);
  }

  // ─── Claims pendientes (admin) ────────────────────────────────────────────
  @Get('claims/pending')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  getPendingClaims(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.service.getPendingClaims(limit, offset);
  }

  // ─── Claims del usuario autenticado ──────────────────────────────────────
  @Get('claims/mine')
  @UseGuards(AuthGuard('jwt'))
  getMyClaims(@Request() req: any) {
    return this.service.getUserClaims(req.user.id);
  }

  // ─── Upload documento para claim ──────────────────────────────────────────
  @Post('claims/upload-document')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async uploadClaimDocument(@UploadedFile() file: Express.Multer.File) {
    const result = await this.cloudinary.upload(file, 'horse-claim-docs');
    return { url: result.secure_url, public_id: result.public_id };
  }

  // ─── Reclamar propiedad ───────────────────────────────────────────────────
  @Post('claims')
  @UseGuards(AuthGuard('jwt'))
  submitClaim(@Body() dto: SubmitClaimDto, @Request() req: any) {
    return this.service.submitClaim(dto, req.user.id);
  }

  // ─── Cola de auditoría (admin) ───────────────────────────────────────────
  @Get('claims/audit')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  getAuditQueue(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.service.getAuditQueue(limit, offset);
  }

  // ─── Aprobar claim pendiente (admin) ──────────────────────────────────────
  @Post('claims/:claimId/approve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  approveClaim(@Param('claimId', ParseUUIDPipe) claimId: string, @Request() req: any) {
    return this.service.approveClaim(claimId, req.user.id);
  }

  // ─── Rechazar / revocar claim (admin) ────────────────────────────────────
  @Post('claims/:claimId/reject')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  rejectClaim(
    @Param('claimId', ParseUUIDPipe) claimId: string,
    @Request() req: any,
    @Body('reason') reason: string,
  ) {
    return this.service.rejectClaim(claimId, req.user.id, reason);
  }

  // ─── Revocar claim auto-aprobado (admin detectó fraude) ──────────────────
  @Post('claims/:claimId/revoke')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  revokeClaim(
    @Param('claimId', ParseUUIDPipe) claimId: string,
    @Request() req: any,
    @Body('reason') reason: string,
  ) {
    return this.service.revokeClaim(claimId, req.user.id, reason ?? 'Fraude detectado');
  }

  // ─── Árbol genealógico ────────────────────────────────────────────────────
  @Get(':id/tree')
  getTree(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('depth', new DefaultValuePipe(4), ParseIntPipe) depth: number,
  ) {
    return this.service.getTree(id, Math.min(depth, 6));
  }

  // ─── Descendientes ───────────────────────────────────────────────────────
  @Get(':id/progeny')
  getProgeny(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getProgeny(id);
  }

  // ─── Ficha individual ─────────────────────────────────────────────────────
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }
}
