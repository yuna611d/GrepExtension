import { IRepository } from "../Interfaces/IRepository";
import { GrepOperation } from "../Entities/GrepOperation";
import { Decoration } from "../Entities/Decoration";

export class GrepController {
    constructor (repository: IRepository) {
        this._repository = repository;
    }
    private readonly _repository: IRepository;

    public DoAction() {
        // TODO temporary prototyep implementation
        const grep = this._repository.GetByID(0) as GrepOperation;
        grep.Operate();

        // TODO temporary prototyep implementation
        const decoration = this._repository.GetByID(1) as Decoration;
        decoration.Operate();

    }

}