"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase-client"

interface Department {
  id: string
  name: string
  roles: { id: string; name: string }[]
}

interface DepartmentSelectProps {
  onSelect: (roleId: string) => void
  className?: string
}

export function DepartmentSelect({ onSelect, className }: DepartmentSelectProps) {
  const [departments, setDepartments] = useState<Department[]>([])

  useEffect(() => {
    fetchDepartments()
  }, [])

  async function fetchDepartments() {
    try {
      const { data: departmentsData, error: departmentsError } = await supabase.from("departments").select("id, name")

      if (departmentsError) throw departmentsError

      const departmentsWithRoles = await Promise.all(
        departmentsData.map(async (dept) => {
          const { data: rolesData, error: rolesError } = await supabase
            .from("roles")
            .select("id, name")
            .eq("department_id", dept.id)

          if (rolesError) throw rolesError

          return {
            ...dept,
            roles: rolesData,
          }
        }),
      )

      setDepartments(departmentsWithRoles)
    } catch (error) {
      console.error("Error fetching departments and roles:", error)
    }
  }

  return (
    <Select onValueChange={onSelect}>
      <SelectTrigger className={`w-full bg-[#1a1a1c] border-[#272727] text-white ${className}`}>
        <SelectValue placeholder="Selecione um departamento" />
      </SelectTrigger>
      <SelectContent className="bg-[#1a1a1c] border-[#272727] text-white">
        {departments.map((department) => (
          <SelectGroup key={department.id}>
            <SelectItem value={department.id} disabled className="text-gray-500">
              {department.name}
            </SelectItem>
            {department.roles.map((role) => (
              <SelectItem key={role.id} value={role.id} className="pl-6">
                {role.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}

