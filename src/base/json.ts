import {Context} from "../context";
import * as path from "path";
import {BlockDict} from "../interface";


export class LocalJsonBase {
    //    Этот класс управляет локальным пулом json файлов, являющихся клонами remote версий
    //    Основно информационный поток: скачивание json с сервера -> рендер его в .md файл -> отображение пользователю
    //    Обратный поток: изменение .md файла -> преобразование в json -> загрузка на сервер
    basePath: string
    ctx: Context

    constructor(ctx: Context) {
        this.ctx = ctx;
        this.basePath = 'w/.blocks'
    }

    async checkBaseFolder() {
        const stat = await this.ctx.app.vault.adapter.stat(this.basePath)
        if (!stat) {
            await this.ctx.app.vault.createFolder(this.basePath);
        }
    }

    private getFilePath(name: string) {
        return path.join(this.basePath, name + '.json')
    }

    async write(data: BlockDict) {
        const name = data._id;
        const filePath = this.getFilePath(name);
        const dataString = JSON.stringify(data);
        const stat = await this.ctx.app.vault.adapter.stat(filePath);
        if (!stat) {
            await this.ctx.app.vault.create(filePath, dataString);
        } else {
            await this.ctx.app.vault.adapter.write(filePath, dataString);
        }
    }

    async read(_id: string): Promise<BlockDict | null> {
        const filePath = this.getFilePath(_id)
        const stat = await this.ctx.app.vault.adapter.stat(filePath)
        if (!stat) {
            return null;
        } else {
            return JSON.parse(await this.ctx.app.vault.adapter.read(filePath));
        }
    }
}

