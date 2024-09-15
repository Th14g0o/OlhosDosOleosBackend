import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { PersistenciaService } from 'src/persistencia/persistencia.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EditaBannerDto } from './dto/edita-banner-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private persistencia: PersistenciaService, private jwt: JwtService) { }

  private readonly saltRounds = 10;
  async create(usu: CreateUsuarioDto, arq: Express.Multer.File) {
    if (!usu.nome) throw new BadRequestException('Preencha o campo do nome');
    if (!usu.email) throw new BadRequestException('Preencha o campo de email');
    if (!usu.usuario) throw new BadRequestException('Preencha o campo do nome de usuario');
    if (!usu.senha) throw new BadRequestException('Preencha o campo da senha');

    if (!usu.email.includes('@')) {
      throw new BadRequestException('Email inválido');
    }

    if (usu.cidadeid) {
      const cidade = await this.persistencia.cidade.findUnique({
        where: { id: usu.cidadeid },
      });
      if (!cidade) {
        throw new BadRequestException('Cidade inválida');
      }
    }

    if (usu.tipoid) {
      const tipo = await this.persistencia.tipoArtista.findUnique({
        where: { nome: usu.tipoid },
      });
      if (!tipo) {
        throw new BadRequestException('Cidade invalida');
      }
    }

    if (usu.insta && !(/https?:\/\/.+/.test(usu.insta))) {
      throw new BadRequestException('Link de Instagram inválido');
    }
    if (usu.face && !(/https?:\/\/.+/.test(usu.face))) {
      throw new BadRequestException('Link de Facebook inválido');
    }
    if (usu.zap && !(/https?:\/\/.+/.test(usu.zap))) {
      throw new BadRequestException('Link de WhatsApp inválido');
    }
    if (usu.youtube && !(/https?:\/\/.+/.test(usu.youtube))) {
      throw new BadRequestException('Link de YouTube inválido');
    }

    if (arq) {
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(arq.mimetype)) {
        throw new BadRequestException('Arquivo enviado não é uma imagem válida');
      }
    }

    if (usu.cor1) {
      if (usu.cor1.length != 6) {
        throw new BadRequestException('Cor 1 inválida');
      }
    }
    if (usu.cor2) {
      if (usu.cor2.length != 6) {
        throw new BadRequestException('Cor 2 inválida');
      }
    }
    if (usu.cor3) {
      if (usu.cor1.length != 6) {
        throw new BadRequestException('Cor 3 inválida');
      }
    }
    if (usu.cor3) {
      if (usu.cor1.length != 6) {
        throw new BadRequestException('Cor 4 inválida');
      }
    }

    try {
      if (arq) {
        usu.imagem = arq.buffer;
        usu.imagemtipo = arq.mimetype;
      }

      const senhaProtegida = await bcrypt.hash(usu.senha, this.saltRounds);
      usu.senha = senhaProtegida;
      const usuario = await this.persistencia.usuario.create({
        data: {
          nome: usu.nome,
          email: usu.email,
          senha: usu.senha,
          usuario: usu.usuario,
          cidade: usu.cidadeid ? { connect: { id: Number(usu.cidadeid) } } : undefined,
          insta: usu.insta,
          youtube: usu.youtube,
          zap: usu.zap,
          face: usu.face,
          tipo: usu.tipoid ? { connect: { nome: usu.tipoid } } : undefined,
          biografia: usu.biografia,
          imagem: usu.imagem,
          imagemtipo: usu.imagemtipo,
          cor1: usu.cor1,
          cor2: usu.cor2,
          cor3: usu.cor3,
          cor4: usu.cor4
        },
      });

      const { senha, ...dadosPublicosUsuario } = usuario;

      return {
        estado: 'ok',
        dados: dadosPublicosUsuario,
      };
    }
    catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw new BadRequestException('Algo deu errado.');
    }
  }

  async findAll() {
    return {
      estado: 'ok',
      dados: await this.persistencia.usuario.findMany({}),
    };
  }

  async acharUsuarioToken(token: string) {
    try {
      const tokenDescodificado = this.jwt.verify(token);
      const usuario = await this.persistencia.usuario.findUnique({
        where: { id: tokenDescodificado.usuario },
        include: {
          cidade: true,
          estado: true,
        },
      });

      if (usuario) {
        const { senha, ...dadosPublicosUsuario } = usuario;

        let localizacao = "";
        if (usuario.cidadeid && usuario.estadoid) localizacao = "Brasil, " + usuario.estado?.nome + ", " + usuario.cidade?.nome;

        const usuarioCompleto = { ...dadosPublicosUsuario, localizacao: localizacao };

        return {
          estado: 'ok',
          dados: usuarioCompleto,
        };
      }
      else {
        return {
          estado: 'nok',
          mensagem: `usuario com ${tokenDescodificado} não existe!`,
        };
      }
    }
    catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token inválido ou expirado.');
      }
      throw new BadRequestException('Erro ao processar a solicitação.');
    }

  }
  async acharUsuarioId(id: number) {
    const usuario = await this.persistencia.usuario.findUnique({
      where: { id: id },
    });
    if (usuario) {
      return {
        estado: 'ok',
        dados: usuario,
      };
    } else {
      return {
        estado: 'nok',
        mensagem: `usuario com ${id} não existe!`,
      };
    }
  }

  public validarImagem(file: Express.Multer.File, nome: string) {
    if (file && !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype)) {
      throw new BadRequestException(`Arquivo enviado para ${nome} não é uma imagem válida`);
    }
  };
  public validarLink(url: string, plataforma: string) {
    if (url && !(/^https?:\/\/.+/.test(url))) {
      throw new BadRequestException(`Link de ${plataforma} inválido`);
    }
  };

  async atualizar(token: string, usu: UpdateUsuarioDto, foto: Express.Multer.File, banner: Express.Multer.File) {
    const tokenDescodificado = this.jwt.verify(token);
    const usuarioAtual = await this.persistencia.usuario.findUnique({
      where: { id: tokenDescodificado.usuario },
    });
    if (!usuarioAtual) throw new NotFoundException('Erro localizando usuario');
    if (!usu.nome) throw new BadRequestException('Preencha o campo do nome');
    if (!usu.email) throw new BadRequestException('Preencha o campo de email');
    if (!usu.usuario) throw new BadRequestException('Preencha o campo do nome de usuario');

    if (!usu.email.includes('@')) {
      throw new BadRequestException('Email inválido');
    }

    if (usu.cidadeid) {
      const cidade = await this.persistencia.cidade.findUnique({
        where: { id: usu.cidadeid },
      });
      if (!cidade) {
        throw new BadRequestException('Cidade inválida');
      }
    }

    if (usu.tipoid) {
      const tipo = await this.persistencia.tipoArtista.findUnique({
        where: { nome: usu.tipoid },
      });
      if (!tipo) {
        throw new BadRequestException('Cidade invalida');
      }
    }

    this.validarLink(usu.insta, 'Instagram');
    this.validarLink(usu.face, 'Facebook');
    this.validarLink(usu.zap, 'WhatsApp');
    this.validarLink(usu.youtube, 'YouTube');

    this.validarImagem(foto, 'foto');
    this.validarImagem(banner, 'banner');

    if (usu.cor1) {
      if (usu.cor1.length != 6) {
        throw new BadRequestException('Cor 1 inválida');
      }
    }
    if (usu.cor2) {
      if (usu.cor2.length != 6) {
        throw new BadRequestException('Cor 2 inválida');
      }
    }
    if (usu.cor3) {
      if (usu.cor1.length != 6) {
        throw new BadRequestException('Cor 3 inválida');
      }
    }
    if (usu.cor3) {
      if (usu.cor1.length != 6) {
        throw new BadRequestException('Cor 4 inválida');
      }
    }
    try {
      if (foto) {
        usu.imagem = foto.buffer;
        usu.imagemtipo = foto.mimetype;
      }
      if (banner) {
        usu.banner = banner.buffer;
        usu.bannertipo = banner.mimetype;
      }

      if (usu.senha) {
        const senhaProtegida = await bcrypt.hash(usu.senha, this.saltRounds);
        usu.senha = senhaProtegida;
      } else {
        usu.senha = usuarioAtual.senha;
      }


      const resultado = await this.persistencia.usuario
        .update({
          where: { id: tokenDescodificado.usuario },
          data: {
            nome: usu.nome,
            email: usu.email,
            senha: usu.senha,
            usuario: usu.usuario,
            cidade: usu.cidadeid ? { connect: { id: Number(usu.cidadeid) } } : undefined,
            insta: usu.insta,
            youtube: usu.youtube,
            zap: usu.zap,
            face: usu.face,
            tipo: usu.tipoid ? { connect: { nome: usu.tipoid } } : undefined,
            biografia: usu.biografia,
            imagem: usu.imagem,
            imagemtipo: usu.imagemtipo,
            banner: usu.banner,
            bannertipo: usu.bannertipo,
            cor1: usu.cor1,
            cor2: usu.cor2,
            cor3: usu.cor3,
            cor4: usu.cor4
          },
        })
        .then((usuario) => {
          const { senha, ...dadosPublicosUsuario } = usuario;
          return {
            estado: 'ok',
            dados: dadosPublicosUsuario,
          };
        })
        .catch((error) => {
          console.log(error);
          return {
            estado: 'nok',
            mensagem: `usuario com ${tokenDescodificado.usuario} não existe!`,
          };
        });
      return resultado;
    }
    catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token inválido ou expirado.');
      }
      console.log(error);
      throw new BadRequestException('Algo deu errado.');
    }

  }


  async editarBanner(token: string, usu: EditaBannerDto, banner: Express.Multer.File) {
    this.validarImagem(banner, 'banner');
    try {
      if (banner) {
        usu.banner = banner.buffer;
        usu.bannertipo = banner.mimetype;
      }
      const tokenDescodificado = this.jwt.verify(token);
      const resultado = await this.persistencia.usuario
        .update({
          where: { id: tokenDescodificado.usuario },
          data: {
            banner: usu.banner,
            bannertipo: usu.bannertipo,
          },
        })
        .then((usuario) => {
          const { senha, ...dadosPublicosUsuario } = usuario;
          return {
            estado: 'ok',
            dados: dadosPublicosUsuario,
          };
        })
        .catch((error) => {
          console.log(error);
          return {
            estado: 'nok',
            mensagem: `usuario com ${tokenDescodificado.usuario} não existe!`,
          };
        });
      return resultado;
    }
    catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token inválido ou expirado.');
      }
      console.log(error);
      throw new BadRequestException('Algo deu errado.');
    }

  }


  async remove(id: number) {
    const resultado = await this.persistencia.usuario
      .delete({ where: { id } })
      .then((usuario) => {
        return { estado: 'ok', dados: usuario };
      })
      .catch((error) => {
        return {
          estado: 'nok',
          mensagem: `usuario com ${id} não existe!`,
        };
      });
    return resultado;
  }
}
