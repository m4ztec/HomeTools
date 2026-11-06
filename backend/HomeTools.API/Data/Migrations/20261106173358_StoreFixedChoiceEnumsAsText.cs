using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HomeTools.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class StoreFixedChoiceEnumsAsText : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE irs_scenarios
                SET InputJson = json_set(
                    InputJson,
                    '$.youthTaxReliefYear',
                    'Year' || json_extract(InputJson, '$.youthTaxReliefYear'))
                WHERE json_type(InputJson, '$.youthTaxReliefYear') = 'integer'
                    AND json_extract(InputJson, '$.youthTaxReliefYear') BETWEEN 1 AND 10;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE irs_scenarios
                SET InputJson = json_set(
                    InputJson,
                    '$.youthTaxReliefYear',
                    CAST(substr(json_extract(InputJson, '$.youthTaxReliefYear'), 5) AS INTEGER))
                WHERE json_type(InputJson, '$.youthTaxReliefYear') = 'text'
                    AND (
                        json_extract(InputJson, '$.youthTaxReliefYear') GLOB 'Year[1-9]'
                        OR json_extract(InputJson, '$.youthTaxReliefYear') = 'Year10');
                """);
        }
    }
}
