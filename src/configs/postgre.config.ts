import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getPostgreConfig = async (configService: ConfigService): Promise<TypeOrmModuleOptions> => {
  return {...getPostgreOptions(configService)}
};

const getPostgreOptions = (configService: ConfigService): TypeOrmModuleOptions => {
  return {
    type: 'postgres',
    host: configService.get('DB_HOST'),
    port: configService.get('DB_PORT'),
    username: configService.get('DB_USER'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_NAME'),
    autoLoadEntities: true, //entities: [Pool], // Подключаем сущности for Pod
    synchronize: true, // Для разработки, в проде лучше миграции
  };
};
