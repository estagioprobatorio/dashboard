package br.gov.pr.seed.ep.model;

public class DadosNotificacaoEmail {
    private String cursistaNome;
    private String cursistaEmail;
    private String cgm;
    private String linhaFuncional;
    private String tipoAcao;
    private String turmaAntiga;
    private String turmaNova;
    private String codSereNova;
    private String formadorAntigoNome;
    private String formadorAntigoEmail;
    private String tutorAntigoNome;
    private String tutorAntigoEmail;
    private String formadorNovoNome;
    private String formadorNovoEmail;
    private String tutorNovoNome;
    private String tutorNovoEmail;
    private String statusDecisao; // "Deferido" ou "Indeferido"
    private String notaResolucao;
    private String dataEfetivacao;
    private int linhaHistIndice;

    public DadosNotificacaoEmail() {}

    public String getCursistaNome() { return cursistaNome; }
    public void setCursistaNome(String cursistaNome) { this.cursistaNome = cursistaNome; }

    public String getCursistaEmail() { return cursistaEmail; }
    public void setCursistaEmail(String cursistaEmail) { this.cursistaEmail = cursistaEmail; }

    public String getCgm() { return cgm; }
    public void setCgm(String cgm) { this.cgm = cgm; }

    public String getLinhaFuncional() { return linhaFuncional; }
    public void setLinhaFuncional(String linhaFuncional) { this.linhaFuncional = linhaFuncional; }

    public String getTipoAcao() { return tipoAcao; }
    public void setTipoAcao(String tipoAcao) { this.tipoAcao = tipoAcao; }

    public String getTurmaAntiga() { return turmaAntiga; }
    public void setTurmaAntiga(String turmaAntiga) { this.turmaAntiga = turmaAntiga; }

    public String getTurmaNova() { return turmaNova; }
    public void setTurmaNova(String turmaNova) { this.turmaNova = turmaNova; }

    public String getCodSereNova() { return codSereNova; }
    public void setCodSereNova(String codSereNova) { this.codSereNova = codSereNova; }

    public String getFormadorAntigoNome() { return formadorAntigoNome; }
    public void setFormadorAntigoNome(String formadorAntigoNome) { this.formadorAntigoNome = formadorAntigoNome; }

    public String getFormadorAntigoEmail() { return formadorAntigoEmail; }
    public void setFormadorAntigoEmail(String formadorAntigoEmail) { this.formadorAntigoEmail = formadorAntigoEmail; }

    public String getTutorAntigoNome() { return tutorAntigoNome; }
    public void setTutorAntigoNome(String tutorAntigoNome) { this.tutorAntigoNome = tutorAntigoNome; }

    public String getTutorAntigoEmail() { return tutorAntigoEmail; }
    public void setTutorAntigoEmail(String tutorAntigoEmail) { this.tutorAntigoEmail = tutorAntigoEmail; }

    public String getFormadorNovoNome() { return formadorNovoNome; }
    public void setFormadorNovoNome(String formadorNovoNome) { this.formadorNovoNome = formadorNovoNome; }

    public String getFormadorNovoEmail() { return formadorNovoEmail; }
    public void setFormadorNovoEmail(String formadorNovoEmail) { this.formadorNovoEmail = formadorNovoEmail; }

    public String getTutorNovoNome() { return tutorNovoNome; }
    public void setTutorNovoNome(String tutorNovoNome) { this.tutorNovoNome = tutorNovoNome; }

    public String getTutorNovoEmail() { return tutorNovoEmail; }
    public void setTutorNovoEmail(String tutorNovoEmail) { this.tutorNovoEmail = tutorNovoEmail; }

    public String getStatusDecisao() { return statusDecisao; }
    public void setStatusDecisao(String statusDecisao) { this.statusDecisao = statusDecisao; }

    public String getNotaResolucao() { return notaResolucao; }
    public void setNotaResolucao(String notaResolucao) { this.notaResolucao = notaResolucao; }

    public String getDataEfetivacao() { return dataEfetivacao; }
    public void setDataEfetivacao(String dataEfetivacao) { this.dataEfetivacao = dataEfetivacao; }

    public int getLinhaHistIndice() { return linhaHistIndice; }
    public void setLinhaHistIndice(int linhaHistIndice) { this.linhaHistIndice = linhaHistIndice; }
}
