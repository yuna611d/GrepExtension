export abstract class BaseEntity {
    get Id() : number { return this._id; }
    set Id(id: number) { this._id = id; }
    protected _id: number = 0;

}