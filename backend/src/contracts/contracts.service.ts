import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from './contract.entity';
import { CreateContractDto } from './dto/create-contract.dto';
import { User } from '../auth/user.entity';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract)
    private readonly repo: Repository<Contract>,
  ) {}

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

  async sign(id: string, signedName: string, user: User): Promise<Contract> {
    const contract = await this.findOne(id, user);
    if (contract.owner_id !== user.id) throw new ForbiddenException('Solo el propietario puede firmar');
    if (contract.status !== 'pending') throw new ForbiddenException('El contrato ya fue procesado');
    contract.status = 'signed';
    contract.signed_name = signedName;
    contract.signed_at = new Date();
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
