import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Trash2, Mail, User } from 'lucide-react';

interface Respondent {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

const getPlanInfo = (plan: string) => {
  switch (plan) {
    case 'start':
      return { name: 'Start Quântico', limits: '5 questões, 100 respostas, 2 pesquisas/mês' };
    case 'vortex':
      return { name: 'Vortex Neural', limits: '10 questões, 250 respostas, 4 pesquisas/mês' };
    case 'nexus':
      return { name: 'Nexus Infinito', limits: 'Questões e respostas ilimitadas, 15 pesquisas/mês' };
    default:
      return { name: 'Start Quântico', limits: '5 questões, 100 respostas, 2 pesquisas/mês' };
  }
};

const AdminRespondents = () => {
  const { plan = 'start' } = useParams<{ plan: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const { toast } = useToast();

  const planInfo = getPlanInfo(plan);

  const loadRespondents = useCallback(async () => {
    try {
      // Como a tabela 'respondents' não existe no esquema atual,
      // vamos simular uma lista vazia por enquanto
      console.log('Tabela respondents não disponível no esquema atual');
      setRespondents([]);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Erro inesperado",
        description: "Tente novamente em alguns momentos.",
        variant: "destructive",
      });
    } finally {
      setLoadingList(false);
    }
  }, [toast]);

  useEffect(() => {
    loadRespondents();
  }, [loadRespondents]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast({
        title: "Erro no cadastro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para cadastrar respondentes.",
          variant: "destructive",
        });
        return;
      }

      // Como a tabela 'respondents' não existe no esquema atual,
      // vamos simular o cadastro por enquanto
      console.log('Simulando cadastro de respondente:', { name: name.trim(), email: email.trim().toLowerCase() });
      
      toast({
        title: "Funcionalidade em desenvolvimento",
        description: "O cadastro de respondentes será implementado em breve.",
        variant: "destructive",
      });
      
      return;

      // Limpar formulário
      setName('');
      setEmail('');
      
      // Recarregar lista
      loadRespondents();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Erro inesperado",
        description: "Tente novamente em alguns momentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, respondentName: string) => {
    // Como a tabela 'respondents' não existe no esquema atual,
    // vamos simular a exclusão por enquanto
    console.log('Simulando exclusão de respondente:', { id, respondentName });
    
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A exclusão de respondentes será implementada em breve.",
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen">
      {/* Seção Superior */}
      <section className="bg-hero py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Link 
              to={`/admin/${plan}`}
              className="flex items-center gap-2 text-brand-white hover:text-brand-white/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Voltar ao Painel</span>
            </Link>
          </div>
          
          <div className="text-center space-y-4">
            <div className="text-sm text-brand-white/90 font-medium">
              Sentiment CX
            </div>
            <h1 className="text-hero text-brand-white font-bold leading-tight">
              Cadastrar Respondentes - {planInfo.name}
            </h1>
            <p className="text-subtitle text-brand-white/90 max-w-2xl mx-auto">
              Adicione respondentes para suas pesquisas
            </p>
            <p className="text-sm text-brand-white/70">
              {planInfo.limits}
            </p>
          </div>
        </div>
      </section>

      {/* Seção Inferior */}
      <section className="bg-section-light py-12 px-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Formulário de Cadastro */}
          <Card className="bg-brand-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-brand-dark-gray flex items-center gap-2">
                <Plus className="w-6 h-6 text-primary" />
                Novo Respondente
              </CardTitle>
              <p className="text-brand-dark-gray/60">
                Cadastre respondentes que poderão participar das suas pesquisas
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-brand-dark-gray flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Nome Completo
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Maria Silva"
                      className="py-3"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-brand-dark-gray flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      E-mail
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ex: maria@empresa.com"
                      className="py-3"
                      required
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  variant="hero"
                  className="w-full md:w-auto px-8 py-3 text-lg font-semibold"
                  disabled={loading}
                >
                  {loading ? 'Adicionando...' : 'Adicionar Respondente'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Lista de Respondentes */}
          <Card className="bg-brand-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-brand-dark-gray">
                Respondentes Cadastrados ({respondents.length})
              </CardTitle>
              <p className="text-brand-dark-gray/60">
                Lista de todos os respondentes cadastrados
              </p>
            </CardHeader>
            <CardContent>
              {loadingList ? (
                <div className="text-center py-8">
                  <div className="text-brand-dark-gray/60">Carregando respondentes...</div>
                </div>
              ) : respondents.length === 0 ? (
                <div className="text-center py-12">
                  <User className="w-12 h-12 text-brand-dark-gray/30 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-brand-dark-gray mb-2">
                    Nenhum respondente cadastrado
                  </h3>
                  <p className="text-brand-dark-gray/60">
                    Use o formulário acima para adicionar seu primeiro respondente.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">Nome</TableHead>
                        <TableHead className="font-semibold">E-mail</TableHead>
                        <TableHead className="font-semibold">Cadastrado em</TableHead>
                        <TableHead className="font-semibold text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {respondents.map((respondent) => (
                        <TableRow key={respondent.id} className="hover:bg-brand-dark-gray/5">
                          <TableCell className="font-medium">{respondent.name}</TableCell>
                          <TableCell className="text-brand-dark-gray/70">{respondent.email}</TableCell>
                          <TableCell className="text-brand-dark-gray/70">
                            {new Date(respondent.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(respondent.id, respondent.name)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default AdminRespondents;