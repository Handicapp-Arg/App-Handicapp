import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Contract } from './contract.entity';
import { CreateContractDto } from './dto/create-contract.dto';
import { User } from '../auth/user.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract)
    private readonly repo: Repository<Contract>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // Huella del texto del contrato — permite detectar si el body cambió después de crearlo.
  private hashBody(body: string): string {
    return crypto.createHash('sha256').update(body, 'utf8').digest('hex');
  }

  async create(dto: CreateContractDto, user: User): Promise<Contract> {
    if (user.role !== 'establecimiento' && user.role !== 'admin') {
      throw new ForbiddenException('Solo los establecimientos pueden crear contratos');
    }
    const contract = this.repo.create({
      establishment_id: user.id,
      owner_id: dto.owner_id,
      horse_id: dto.horse_id ?? null,
      title: dto.title,
      body: dto.body,
      status: 'pending',
      body_hash: this.hashBody(dto.body),
    });
    return this.repo.save(contract);
  }

  async findMine(user: User): Promise<Contract[]> {
    const where = user.role === 'establecimiento' || user.role === 'admin'
      ? { establishment_id: user.id }
      : { owner_id: user.id };
    return this.repo.find({
      where,
      order: { created_at: 'DESC' },
      relations: ['owner', 'establishment', 'horse'],
    });
  }

  async findOne(id: string, user: User): Promise<Contract> {
    const contract = await this.repo.findOne({
      where: { id },
      relations: ['owner', 'establishment', 'horse'],
    });
    if (!contract) throw new NotFoundException('Contrato no encontrado');
    if (contract.establishment_id !== user.id && contract.owner_id !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('Sin acceso a este contrato');
    }
    return contract;
  }

  // Firma de doble parte (establecimiento + propietario). El contrato queda 'signed'
  // sólo cuando ambas partes firmaron. La firma es una imagen (Cloudinary) + nombre +
  // fecha/hora estampada por el servidor (no manipulable).
  async sign(
    id: string,
    signedName: string,
    file: Express.Multer.File | undefined,
    user: User,
  ): Promise<Contract> {
    const contract = await this.findOne(id, user);
    if (contract.status === 'rejected') {
      throw new ForbiddenException('El contrato fue rechazado');
    }
    if (contract.status === 'signed') {
      throw new ForbiddenException('El contrato ya está firmado por ambas partes');
    }
    // Anti-adulteración: el texto no debe haber cambiado desde que se creó.
    if (contract.body_hash && this.hashBody(contract.body) !== contract.body_hash) {
      throw new BadRequestException('El contrato fue modificado y no se puede firmar');
    }

    const isEstablishment = contract.establishment_id === user.id;
    const isOwner = contract.owner_id === user.id;
    if (!isEstablishment && !isOwner) {
      throw new ForbiddenException('No sos parte de este contrato');
    }

    let signatureUrl: string | null = null;
    if (file) {
      const result = await this.cloudinary.upload(file, 'handicapp/signatures');
      signatureUrl = result.secure_url;
    }
    const now = new Date();

    if (isOwner) {
      if (contract.signed_at) throw new ForbiddenException('Ya firmaste este contrato');
      contract.signed_name = signedName;
      contract.signed_at = now;
      contract.owner_signature_url = signatureUrl;
    } else {
      if (contract.establishment_signed_at) {
        throw new ForbiddenException('Ya firmaste este contrato');
      }
      contract.establishment_signed_name = signedName;
      contract.establishment_signed_at = now;
      contract.establishment_signature_url = signatureUrl;
    }

    // Firmado sólo cuando ambas partes pusieron su firma.
    if (contract.signed_at && contract.establishment_signed_at) {
      contract.status = 'signed';
    }
    return this.repo.save(contract);
  }

  async reject(id: string, reason: string, user: User): Promise<Contract> {
    const contract = await this.findOne(id, user);
    if (contract.owner_id !== user.id) throw new ForbiddenException('Solo el propietario puede rechazar');
    if (contract.status !== 'pending') throw new ForbiddenException('El contrato ya fue procesado');
    contract.status = 'rejected';
    contract.rejection_reason = reason;
    return this.repo.save(contract);
  }

  async remove(id: string, user: User): Promise<void> {
    const contract = await this.findOne(id, user);
    if (contract.establishment_id !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('Solo el establecimiento puede eliminar el contrato');
    }
    await this.repo.delete(id);
  }
}
