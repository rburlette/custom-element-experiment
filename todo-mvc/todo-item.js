import {freshElement} from '../fresh.js';

const ESCAPE_KEY = 27;
const ENTER_KEY = 13;

const templateString = /*html*/`
	<div className="view">
		<input
			class="toggle"
			type="checkbox"
			[.checked]="this.state.completed"
			[.onchange]="this.onToggle"
		/>
		<label [.ondoubleclick]="this.handleEdit">
			{{this.state.title}}
		</label>
		<button class="destroy" onclick="this.onDestroy"></button>
	</div>
	<input
		ref="editField"
		class="edit"
		[.value]="this.state.editText"
		[.onblur]="e => this.handleSubmit(e)"
		[.onchange]="e => this.handleChange(e)"
		[.onkeydown]="e => this.handleKeyDown(e)"
	/>
</li>
`;

class todoItem extends freshElement {
	constructor() {
		super(templateString);
	}

	handleSubmit() {
		let value = this.state.editText.trim();
		if (value) {
			this.state.editText = value;
			this.onsave(value);
		} else {
			this.ondestroy();
		}
	}

	handleEdit() {
		this.onedit();
		this.state.editText = this.state.title;
		this.refresh();
	}

	handleKeyDown(event) {
		if (event.which === ESCAPE_KEY) {
			this.state.editText = this.state.title;
			this.props.onCancel(event);
		} else if (event.which === ENTER_KEY) {
			this.handleSubmit(event);
		}
	}

	handleChange(event) {
		if (this.props.editing) {
			this.setState({editText: event.target.value});
		}
	}
}

customElements.define('todo-item', todoItem);
