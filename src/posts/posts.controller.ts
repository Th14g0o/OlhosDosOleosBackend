import { Body, Controller, Get, Param, Post, Req, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { AnyFilesInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { CriarPost } from './dto/post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @ApiTags('Post')
  @Post('criar')
  @UseInterceptors(AnyFilesInterceptor())
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  Criar(@Req() req: Request, @Body() criarPost: CriarPost, @UploadedFiles() arquivos: Array<Express.Multer.File> | undefined) {
    const imagem = arquivos.find(arq => arq.fieldname === 'imagem');
    const arqprocesso = arquivos.filter(arq => arq.fieldname === 'processo');
    console.log('criarPost:', criarPost);
    console.log('imagem:', imagem);
    console.log('processo:', arqprocesso);
    const authHeader = req.headers['authorization']; 
    if (authHeader) {
      const token = authHeader.split(' ')[1]; 
      return this.postsService.criar(token, criarPost, imagem, arqprocesso)
    }
    return { message: 'Token não encontrado' };
  }

  @ApiTags('Post')
  @Get('listar')
  listar() {
    return this.postsService.listar();
  }

  @ApiTags('Post')
  @Get('meus')
  @UseGuards(JwtAuthGuard)
  meus(@Req() req: Request) {
    const authHeader = req.headers['authorization']; 
    if (authHeader) {
      const token = authHeader.split(' ')[1]; 
      return this.postsService.meus(token);
    }
    return { message: 'Token não encontrado' };
  }

  @ApiTags('Post')
  @Get('usuario/:id')
  listarPostUsuario(@Req() req: Request, @Param('id') id: string) {
    try{
      const authHeader = req.headers['authorization']; // Use brackets para acessar propriedades desconhecidas
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        const ehMeuPerfil = this.postsService.ehMeuPerfil(token, +id);
        if (ehMeuPerfil) return this.postsService.meus(token);
      }
      return this.postsService.listarPostUsuario(Number(id));
    }
    catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return{
          message:'Token inválido ou expirado.',
        };
      }
      return{
        message:'Algo deu errado.',
      };
    }

    
  }

  
  

}