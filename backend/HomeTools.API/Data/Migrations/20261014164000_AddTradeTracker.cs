using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HomeTools.API.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTradeTracker : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tracked_assets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    OwnerId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Symbol = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    Currency = table.Column<string>(type: "TEXT", maxLength: 3, nullable: false),
                    CurrentPrice = table.Column<decimal>(type: "TEXT", precision: 18, scale: 8, nullable: true),
                    CreatedAt = table.Column<long>(type: "INTEGER", nullable: false),
                    UpdatedAt = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tracked_assets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "trades",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    AssetId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Side = table.Column<string>(type: "TEXT", maxLength: 4, nullable: false),
                    Quantity = table.Column<decimal>(type: "TEXT", precision: 18, scale: 8, nullable: false),
                    UnitPrice = table.Column<decimal>(type: "TEXT", precision: 18, scale: 8, nullable: false),
                    Fees = table.Column<decimal>(type: "TEXT", precision: 18, scale: 8, nullable: false),
                    TradedAt = table.Column<long>(type: "INTEGER", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 240, nullable: true),
                    CreatedAt = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trades", x => x.Id);
                    table.ForeignKey(
                        name: "FK_trades_tracked_assets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "tracked_assets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tracked_assets_OwnerId_Symbol",
                table: "tracked_assets",
                columns: new[] { "OwnerId", "Symbol" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trades_AssetId_TradedAt_CreatedAt",
                table: "trades",
                columns: new[] { "AssetId", "TradedAt", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "trades");
            migrationBuilder.DropTable(name: "tracked_assets");
        }
    }
}
