import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  ParseFilePipeBuilder,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { HorsesService } from './horses.service';
import { CreateHorseDto } from './dto/create-horse.dto';
import { UpdateHorseDto } from './dto/update-horse.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../auth/user.entity';

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
  findAll(@GetUser() user: User) {
    return this.horsesService.findAll(user);
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

  @Delete(':id')
  @RequirePermission('horses', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.horsesService.remove(id, user);
  }
}
