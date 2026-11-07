package br.gov.pr.seed.ep.model;

public class TurmaResumo {
    private String codigo;
    private String componente;
    private String anoFormativo;
    private String modalidade;
    private String turno;
    private String diaSemana;
    private String horario;
    private String formadorNome;
    private String formadorEmail;
    private String tutorNome;
    private String tutorEmail;
    private int totalMatriculados;

    public TurmaResumo() {}

    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }

    public String getComponente() { return componente; }
    public void setComponente(String componente) { this.componente = componente; }

    public String getAnoFormativo() { return anoFormativo; }
    public void setAnoFormativo(String anoFormativo) { this.anoFormativo = anoFormativo; }

    public String getModalidade() { return modalidade; }
    public void setModalidade(String modalidade) { this.modalidade = modalidade; }

    public String getTurno() { return turno; }
    public void setTurno(String turno) { this.turno = turno; }

    public String getDiaSemana() { return diaSemana; }
    public void setDiaSemana(String diaSemana) { this.diaSemana = diaSemana; }

    public String getHorario() { return horario; }
    public void setHorario(String horario) { this.horario = horario; }

    public String getFormadorNome() { return formadorNome; }
    public void setFormadorNome(String formadorNome) { this.formadorNome = formadorNome; }

    public String getFormadorEmail() { return formadorEmail; }
    public void setFormadorEmail(String formadorEmail) { this.formadorEmail = formadorEmail; }

    public String getTutorNome() { return tutorNome; }
    public void setTutorNome(String tutorNome) { this.tutorNome = tutorNome; }

    public String getTutorEmail() { return tutorEmail; }
    public void setTutorEmail(String tutorEmail) { this.tutorEmail = tutorEmail; }

    public int getTotalMatriculados() { return totalMatriculados; }
    public void setTotalMatriculados(int totalMatriculados) { this.totalMatriculados = totalMatriculados; }

    @Override
    public String toString() {
        String comp = (componente != null && !componente.isEmpty()) ? componente : "GERAL";
        String hor = (horario != null && !horario.isEmpty()) ? horario : (turno != null ? turno : "");
        String form = (formadorNome != null && !formadorNome.isEmpty()) ? formadorNome : "Sem Formador";
        return String.format("%s  |  %s  |  %s  |  Formador(a): %s  (%d cursistas)", codigo, comp, hor, form, totalMatriculados);
    }
}
