import {freshElement} from '../fresh.js';
import './todo-item.js';

const app = {
	ALL_TODOS: 'all',
	ACTIVE_TODOS: 'active',
	COMPLETED_TODOS: 'completed'
};

const ENTER_KEY = 13;

const templateString = /*html*/`
<header className="header">
	<h1>todos</h1>
	<input
		class="new-todo"
		placeholder="What needs to be done?"
		[.value]="this.newTodo" [.onkeydown]="this.handleNewTodoKeyDown"
		[.onchange]="this.handleChange"
		autoFocus
	/>
</header>
<section fjs-if="this.todos.length > 0" class="main">
	<input
		id="toggle-all"
		class="toggle-all"
		type="checkbox"
		[.onchange]="this.toggleAll"
		[.checked]="activeTodoCount === 0"
	/>
	<label for="toggle-all"></label>
	<ul class="todo-list">
		<li fjs-for="todo in this.todos">
			<todo-item [.state]="todo"></todo-item>
		</li>
	</ul>
</section>
<todo-footer
	[.count]="activeTodoCount"
	[.completedcount]="completedCount"
	[.nowshowing]="this.nowShowing"
	[.onclearcompleted]="this.clearCompleted"
></todo-footer>
`;

class todoApp extends freshElement {
	constructor() {
		super(templateString);

		this._todos = [];

		this.refresh();
	}

	set todos(todoArray) {
		this._todos = todoArray;
		this.refreshShownTodos();
	}

	get todos() {
		return this._todos;
	}

	refreshShownTodos() {
		this.completedCount = 0;

		this.shownTodos = this._todos.filter(todo =>  {
			if(todo.completed)
				this.completedCount++;

			switch (this.nowShowing) {
				case app.ACTIVE_TODOS:
				return !todo.completed;
			case app.COMPLETED_TODOS:
				return todo.completed;
			default:
				return true;
			}
		});

		this.totalCount = this._todos.length;
		this.remainingCount = this.totalCount - this.completedCount;
	}

	addTodo(text) {
		this.todos.add({ text: text });
	}

	handleChange(event) {
		this.setState({newTodo: event.target.value});
	}

	handleNewTodoKeyDown(event) {
		if (event.keyCode !== ENTER_KEY) {
			return;
		}

		event.preventDefault();

		var val = this.state.newTodo.trim();

		if (val) {
			this.props.model.addTodo(val);
			this.setState({newTodo: ''});
		}
	}

	toggleAll (event) {
		var checked = event.target.checked;
		this.props.model.toggleAll(checked);
	}

	toggle(todoToToggle) {
		this.props.model.toggle(todoToToggle);
	}

	destroy(todo) {
		this.props.model.destroy(todo);
	}

	edit(todo) {
		this.setState({editing: todo.id});
	}

	save(todoToSave, text) {
		this.props.model.save(todoToSave, text);
		this.setState({editing: null});
	}

	cancel() {
		this.setState({editing: null});
	}

	clearCompleted() {
		this.props.model.clearCompleted();
	}

	refresh() {


		super.refresh();
	}
}



customElements.define('todo-app', todoApp);