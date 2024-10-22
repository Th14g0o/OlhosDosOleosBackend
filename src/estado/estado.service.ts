import { Injectable } from '@nestjs/common';
import { PersistenciaService } from 'src/persistencia/persistencia.service';

@Injectable()
export class EstadoService {
    constructor(private persistencia: PersistenciaService) { }
    async listar() {
        return {
            estado: 'ok',
            dados: await this.persistencia.estado.findMany({
                orderBy: {
                    nome: "asc",
                }
            }),
        };
    }
}
