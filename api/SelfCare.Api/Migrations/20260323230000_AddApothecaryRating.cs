using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SelfCare.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddApothecaryRating : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ApothecaryRatingJson",
                table: "Products",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApothecaryRatingJson",
                table: "Products");
        }
    }
}
