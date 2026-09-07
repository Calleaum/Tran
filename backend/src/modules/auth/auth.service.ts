import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { User } from 'src/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private hashPassword(password: string, salt: string): string {
    return createHash('sha256')
      .update(salt + password)
      .digest('hex');
  }

  private async generateHashWithSalt(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const hash = this.hashPassword(password, salt);
    return `${salt}:${hash}`;
  }

  private async verifyPassword(password: string, stored: string): Promise<boolean> {
    const [salt, hash] = stored.split(':');
    const hashCheck = this.hashPassword(password, salt);
    return hash === hashCheck;
  }

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, username, password } = registerDto;

    const existingUser = await this.usersRepository.findOne({
      where: [{ email }, { username }],
    });

    if (existingUser) {
      throw new BadRequestException('Email or username already in use');
    }

    const hashedPassword = await this.generateHashWithSalt(password);

    const user = this.usersRepository.create({
      email,
      username,
      password: hashedPassword,
    });

    await this.usersRepository.save(user);

    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user || !user.password) {
      // !user.password : compte créé via OAuth 42, pas de mot de passe local.
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.verifyPassword(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }

  /**
   * Échange le code OAuth reçu de 42 contre un access_token, puis récupère
   * le profil de l'utilisateur sur l'API 42.
   */
  async exchangeFortyTwoCode(code: string): Promise<any> {
    const tokenRes = await fetch('https://api.intra.42.fr/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.FORTYTWO_CLIENT_ID,
        client_secret: process.env.FORTYTWO_CLIENT_SECRET,
        code,
        redirect_uri: process.env.FORTYTWO_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      throw new UnauthorizedException('Échange du code OAuth 42 impossible');
    }

    const { access_token } = (await tokenRes.json()) as { access_token: string };

    const profileRes = await fetch('https://api.intra.42.fr/v2/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileRes.ok) {
      throw new UnauthorizedException('Récupération du profil 42 impossible');
    }

    return profileRes.json();
  }

  /**
   * Trouve ou crée le compte local correspondant à un profil 42, puis
   * renvoie un JWT applicatif (même format que login()/register()).
   */
  async loginWithFortyTwo(profile: any) {
    const fortyTwoId = String(profile.id);
    const email: string = profile.email;
    const fortyTwoAvatar: string | undefined = profile.image?.link;

    let user = await this.usersRepository.findOne({ where: { fortyTwoId } });

    if (!user) {
      // Un compte local existe peut-être déjà avec cet email (inscription
      // classique) : dans ce cas on lie le compte 42 dessus plutôt que
      // de créer un doublon.
      user = await this.usersRepository.findOne({ where: { email } });

      if (user) {
        user.fortyTwoId = fortyTwoId;
        if (!user.avatar && fortyTwoAvatar) user.avatar = fortyTwoAvatar;
      } else {
        const username = await this.generateUniqueUsername(profile.login);
        user = this.usersRepository.create({
          email,
          username,
          fortyTwoId,
          avatar: fortyTwoAvatar,
        });
      }

      await this.usersRepository.save(user);
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }

  /** Garantit l'unicité du username local (colonne UNIQUE côté 42, pas côté nous). */
  private async generateUniqueUsername(base: string): Promise<string> {
    let candidate = base;
    let suffix = 1;
    while (await this.usersRepository.findOne({ where: { username: candidate } })) {
      candidate = `${base}${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  async validateUser(id: string) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async getMe(id: string) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      wins: user.wins,
      losses: user.losses,
    };
  }
}
