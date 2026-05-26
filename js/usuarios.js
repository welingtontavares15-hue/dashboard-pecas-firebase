const Usuarios = {
    render() {
        if (typeof App !== 'undefined' && App.currentPage === 'fornecedores') {
            if (typeof Fornecedores !== 'undefined') {
                Fornecedores.render();
            }
            return;
        }

        if (typeof Tecnicos !== 'undefined') {
            Tecnicos.render();
        }
    }
};

if (typeof window !== 'undefined') {
    window.Usuarios = Usuarios;
}
