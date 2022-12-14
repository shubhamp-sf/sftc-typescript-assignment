import FormatDate from "../decorators/FormatDate.js";
import Replace from "../decorators/Replace.js";
import { getTemplateContent, qs } from "../utils/dom.js";
import Validator from "../utils/validation.js";

export enum Roles {
	SuperAdmin = 1,
	Admin,
	Subscriber,
}

export interface UserEntry {
	firstName: string;
	lastName: string;
	email: string;
	address: string;
	phone: number;
	role: Roles;
	dob: `${number}-${number}-${number}`;
}

class User {
	private _data: UserEntry;
	public hide: boolean = false;
	public editMode: boolean = false;
	private userInputs: Partial<Record<keyof UserEntry, any>> = {};
	public deleted: boolean = false;
	private updateListener: Function = () => false;
	constructor(data: UserEntry, private fields: FieldSchema[]) {
		this._data = data;
	}

	getEntryRow(): HTMLTableRowElement {
		let tr = document.createElement("tr");
		for (let field of this.fields) {
			const td = document.createElement("td");
			const key = field.key as keyof UserEntry;

			if (this.editMode) {
				// render inputs
				let input: HTMLInputElement | HTMLSelectElement = document.createElement("input");
				if (typeof field.value === "string") {
					input.type = field.value;
					input.name = field.key;
					input.value = this.userInputs[key].toString();
					input.oninput = () => {
						this.userInputs[key] = input.value;
					};
				} else if (Array.isArray(field.value)) {
					input = document.createElement("select");
					input.className = "browser-default";
					input.style.width = "max-content";
					for (let option of field.value) {
						input.innerHTML += `<option value="${option[0]}" ${
							this.userInputs.role.toString() === option[0].toString() ? "selected" : ""
						}>${option[1]}</option>`;
					}
					input.onchange = () => {
						this.userInputs[key] = input.value;
					};
				}
				td.appendChild(input);
			} else {
				// render values
				if (this.columnData[key]) {
					td.innerText = this.columnData[key].toString();
				} else {
					td.innerText = "-";
				}
			}

			tr.appendChild(td);
		}

		// action buttons
		let td = document.createElement("td");
		td.style.width = "150px";
		td.style.textAlign = "center";
		let buttons = getTemplateContent(this.editMode ? "edit-mode-actions" : "general-mode-actions");

		td.appendChild(buttons);

		if (!this.editMode) {
			(qs("button.edit-button", td) as HTMLButtonElement).addEventListener("click", () => {
				this.editMode = true;
				this.userInputs = { ...this._data };
				this.triggerUpdate();
			});
			(qs("button.delete-button", td) as HTMLButtonElement).addEventListener("click", () => {
				let confirmed = confirm("Are you sure?");
				if (confirmed) {
					this.deleted = true;
					this.triggerUpdate();
				}
			});
		} else {
			(qs("button.save-button", td) as HTMLButtonElement).addEventListener("click", () => {
				let updatedData = {
					...this._data,
					...this.userInputs,
				};
				let allGood = true;
				for (let field of this.fields) {
					let valid = Validator.run(updatedData[field.key as keyof UserEntry], field.validations);
					if (!valid) {
						allGood = false;
						window.M.toast({ html: `Invalid ${field.label}` });
						break;
					}
				}
				if (allGood) {
					this._data = updatedData;
					this.editMode = false;
					this.triggerUpdate();
				}
			});
			(qs("button.cancel-button", td) as HTMLButtonElement).addEventListener("click", () => {
				this.editMode = false;
				this.triggerUpdate();
			});
		}

		tr.appendChild(td);

		return tr;
	}

	get data() {
		return this._data;
	}

	@Replace([
		{ key: "role", from: Roles.SuperAdmin, to: "Super Admin" },
		{ key: "role", from: Roles.Admin, to: "Admin" },
		{ key: "role", from: Roles.Subscriber, to: "Subscriber" },
	])
	@FormatDate("dob")
	get columnData() {
		return this._data;
	}

	contains(query: string) {
		let dataToMatchWith = this.fields.map((f) => f.key as keyof UserEntry).map((key) => this.columnData[key]);

		return dataToMatchWith.join(" ").toLowerCase().includes(query.trim().toLowerCase());
	}

	triggerUpdate() {
		this.updateListener();
	}

	addUpdateListener(callback: Function) {
		this.updateListener = callback;
	}
}

export default User;
