declare module "readline-vim" {
    import * as readline from "readline"
    function readlineVim(rl: readline.Interface): any
    export = readlineVim
}
