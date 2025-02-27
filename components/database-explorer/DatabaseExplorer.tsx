"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

// Interface para estrutura de tabela
interface TableStructure {
  name: string;
  columns: Array<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }>;
  sample: any[];
  rowCount: number;
}

// Interface para dados de consulta
interface QueryResult {
  success: boolean;
  data: any[];
  metadata: {
    table: string;
    count: number;
    limit: number;
    offset: number;
    orderBy: string;
    orderDir: string;
    filter: string | null;
  };
  timestamp: string;
}

export default function DatabaseExplorer() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [tableStructure, setTableStructure] = useState<TableStructure | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Opções de consulta
  const [limit, setLimit] = useState<number>(50);
  const [offset, setOffset] = useState<number>(0);
  const [orderBy, setOrderBy] = useState<string>("id");
  const [orderDir, setOrderDir] = useState<"asc" | "desc">("asc");
  const [filterColumn, setFilterColumn] = useState<string>("");
  const [filterValue, setFilterValue] = useState<string>("");
  
  // Carregar lista de tabelas ao montar o componente
  useEffect(() => {
    fetchTables();
  }, []);
  
  // Carregar estrutura da tabela quando uma tabela é selecionada
  useEffect(() => {
    if (selectedTable) {
      fetchTableStructure(selectedTable);
    } else {
      setTableStructure(null);
      setQueryResult(null);
    }
  }, [selectedTable]);
  
  // Buscar lista de tabelas
  const fetchTables = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/database-explorer');
      const data = await response.json();
      
      if (data.success) {
        setTables(data.tables);
      } else {
        setError(data.error || 'Erro ao buscar tabelas');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar tabelas');
    } finally {
      setLoading(false);
    }
  };
  
  // Buscar estrutura da tabela
  const fetchTableStructure = async (tableName: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/database-explorer/table/${tableName}`);
      const data = await response.json();
      
      if (data.success) {
        setTableStructure(data.table);
        
        // Definir orderBy padrão com base na primeira coluna
        if (data.table.columns && data.table.columns.length > 0) {
          const hasId = data.table.columns.some((col: any) => col.column_name === 'id');
          setOrderBy(hasId ? 'id' : data.table.columns[0].column_name);
        }
      } else {
        setError(data.error || 'Erro ao buscar estrutura da tabela');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar estrutura da tabela');
    } finally {
      setLoading(false);
    }
  };
  
  // Consultar dados da tabela
  const queryTable = async () => {
    if (!selectedTable) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Construir URL com parâmetros de consulta
      let url = `/api/database-explorer/query/${selectedTable}?limit=${limit}&offset=${offset}&orderBy=${orderBy}&orderDir=${orderDir}`;
      
      if (filterColumn && filterValue) {
        url += `&filter=${filterColumn}&value=${filterValue}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setQueryResult(data);
      } else {
        setError(data.error || 'Erro ao consultar tabela');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao consultar tabela');
    } finally {
      setLoading(false);
    }
  };
  
  // Avançar para a próxima página
  const nextPage = () => {
    if (queryResult) {
      setOffset(offset + limit);
    }
  };
  
  // Voltar para a página anterior
  const prevPage = () => {
    if (offset >= limit) {
      setOffset(offset - limit);
    }
  };
  
  // Formatar valor para exibição na tabela
  const formatValue = (value: any) => {
    if (value === null || value === undefined) return <span className="text-gray-400">NULL</span>;
    if (typeof value === 'object') return <span className="text-blue-500">{JSON.stringify(value)}</span>;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value);
  };
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Explorador de Banco de Dados</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Erro:</strong> {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Tabelas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  onClick={fetchTables}
                  disabled={loading}
                  className="w-full mb-2"
                >
                  {loading ? 'Carregando...' : 'Atualizar Tabelas'}
                </Button>
                
                <div className="max-h-96 overflow-y-auto">
                  <ul className="space-y-1">
                    {tables.map(table => (
                      <li key={table}>
                        <Button
                          variant={selectedTable === table ? "default" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => setSelectedTable(table)}
                        >
                          {table}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-3">
          {selectedTable ? (
            <Tabs defaultValue="query">
              <TabsList className="mb-4">
                <TabsTrigger value="structure">Estrutura</TabsTrigger>
                <TabsTrigger value="query">Consulta</TabsTrigger>
              </TabsList>
              
              <TabsContent value="structure">
                <Card>
                  <CardHeader>
                    <CardTitle>Estrutura da Tabela: {selectedTable}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center">Carregando estrutura...</div>
                    ) : tableStructure ? (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Colunas:</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Nulo?</TableHead>
                              <TableHead>Padrão</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tableStructure.columns.map((column, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{column.column_name}</TableCell>
                                <TableCell>{column.data_type}</TableCell>
                                <TableCell>{column.is_nullable === 'YES' ? 'Sim' : 'Não'}</TableCell>
                                <TableCell>{column.column_default || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        
                        <h3 className="text-lg font-semibold my-4">Amostra de Dados:</h3>
                        {tableStructure.sample.length > 0 ? (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {Object.keys(tableStructure.sample[0]).map(key => (
                                    <TableHead key={key}>{key}</TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {tableStructure.sample.map((row, rowIndex) => (
                                  <TableRow key={rowIndex}>
                                    {Object.values(row).map((value, colIndex) => (
                                      <TableCell key={colIndex}>
                                        {formatValue(value)}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-center py-4">Nenhum dado encontrado</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center">Selecione uma tabela para ver sua estrutura</div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="query">
                <Card>
                  <CardHeader>
                    <CardTitle>Consultar: {selectedTable}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Ordernar por</label>
                        <select 
                          className="w-full p-2 border rounded"
                          value={orderBy}
                          onChange={(e) => setOrderBy(e.target.value)}
                          disabled={!tableStructure}
                        >
                          {tableStructure?.columns.map(col => (
                            <option key={col.column_name} value={col.column_name}>
                              {col.column_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Direção</label>
                        <select 
                          className="w-full p-2 border rounded"
                          value={orderDir}
                          onChange={(e) => setOrderDir(e.target.value as "asc" | "desc")}
                        >
                          <option value="asc">Ascendente</option>
                          <option value="desc">Descendente</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Limite</label>
                        <Input 
                          type="number" 
                          value={limit} 
                          onChange={(e) => setLimit(Number(e.target.value))}
                          min={1}
                          max={1000}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Filtrar por coluna</label>
                        <select 
                          className="w-full p-2 border rounded"
                          value={filterColumn}
                          onChange={(e) => setFilterColumn(e.target.value)}
                          disabled={!tableStructure}
                        >
                          <option value="">Selecione...</option>
                          {tableStructure?.columns.map(col => (
                            <option key={col.column_name} value={col.column_name}>
                              {col.column_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Valor do filtro</label>
                        <Input 
                          type="text" 
                          value={filterValue} 
                          onChange={(e) => setFilterValue(e.target.value)}
                          disabled={!filterColumn}
                        />
                      </div>
                      
                      <div className="flex items-end">
                        <Button 
                          onClick={queryTable}
                          disabled={loading || !selectedTable}
                          className="w-full"
                        >
                          {loading ? 'Consultando...' : 'Consultar'}
                        </Button>
                      </div>
                    </div>
                    
                    {queryResult && (
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <span className="text-sm">
                              {queryResult.metadata.count} resultados | Mostrando {offset + 1}-{offset + queryResult.data.length} 
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={prevPage}
                              disabled={offset === 0}
                            >
                              Anterior
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={nextPage}
                              disabled={queryResult.data.length < limit}
                            >
                              Próximo
                            </Button>
                          </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {queryResult.data.length > 0 && Object.keys(queryResult.data[0]).map(key => (
                                  <TableHead key={key}>{key}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {queryResult.data.map((row, rowIndex) => (
                                <TableRow key={rowIndex}>
                                  {Object.values(row).map((value, colIndex) => (
                                    <TableCell key={colIndex}>
                                      {formatValue(value)}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center p-12">
                  <h3 className="text-xl font-semibold mb-2">Selecione uma tabela</h3>
                  <p className="text-gray-500">
                    Escolha uma tabela do banco de dados para visualizar sua estrutura e dados.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 