import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req: any) {
    return this.authService.getMe(req.user.id);
  }

  // GET /auth/42 : redirige le navigateur vers la page d'autorisation 42.
  @Get('42')
  redirectToFortyTwo(@Res() res: Response) {
    const params = new URLSearchParams({
      client_id: process.env.FORTYTWO_CLIENT_ID || '',
      redirect_uri: process.env.FORTYTWO_REDIRECT_URI || '',
      response_type: 'code',
      scope: 'public',
    });
    res.redirect(`https://api.intra.42.fr/oauth/authorize?${params.toString()}`);
  }

  // GET /auth/42/callback : 42 revient ici avec ?code=... après autorisation.
  // On échange le code, on connecte/crée le compte, puis on redirige vers
  // le frontend avec le JWT applicatif en paramètre d'URL.
  @Get('42/callback')
  async fortyTwoCallback(@Query('code') code: string, @Res() res: Response) {
    if (!code) {
      throw new BadRequestException('Missing OAuth code');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://localhost:3000';

    try {
      const profile = await this.authService.exchangeFortyTwoCode(code);
      const { access_token } = await this.authService.loginWithFortyTwo(profile);
      res.redirect(`${frontendUrl}/auth/callback?token=${encodeURIComponent(access_token)}`);
    } catch {
      res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
  }
}
